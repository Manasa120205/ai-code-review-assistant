from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from github import Github
import json
import asyncio

# from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class GitHubSetup(BaseModel):
    github_token: str
    
class AnalyzePRRequest(BaseModel):
    repo_url: str
    pr_number: int
    github_token: str

class CodeSuggestion(BaseModel):
    file_path: str
    line_number: Optional[int] = None
    suggestion: str
    category: str  # "architecture", "best_practice", "performance", "maintainability"
    severity: str  # "high", "medium", "low"

class SecurityIssue(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    file_path: str
    line_number: Optional[int] = None
    issue_type: str
    description: str
    severity: str  # "critical", "high", "medium", "low"
    recommendation: str

class QualityMetric(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pr_id: str
    complexity_score: float
    maintainability_score: float
    overall_score: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CodeReview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pr_id: str
    repo: str
    pr_number: int
    suggestions: List[CodeSuggestion]
    security_issues: List[SecurityIssue]
    quality_metrics: QualityMetric
    summary: str
    files_analyzed: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PullRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    repo: str
    pr_number: int
    title: str
    author: str
    status: str  # "pending", "analyzing", "completed", "failed"
    files_changed: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    review_id: Optional[str] = None

# ============ AI CODE ANALYZER ============

class AICodeAnalyzer:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        
    async def analyze_code_file(self, file_path: str, content: str, context: str = "") -> Dict[str, Any]:
        """Analyze a single code file for quality, security, and improvements"""
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"code-review-{uuid.uuid4()}",
            system_message="""You are an expert code reviewer with deep knowledge of software architecture, 
            security best practices, and code quality. Analyze code comprehensively and provide:
            1. Architectural improvements
            2. Security vulnerabilities
            3. Performance optimizations
            4. Maintainability suggestions
            5. Best practice violations
            
            Your suggestions should be specific, actionable, and helpful - not generic."""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Analyze this code file and provide detailed review:
        
File: {file_path}
Context: {context}

```
{content}
```

Provide analysis in JSON format:
{{
  "suggestions": [
    {{
      "line_number": <number or null>,
      "suggestion": "<specific suggestion>",
      "category": "architecture|best_practice|performance|maintainability",
      "severity": "high|medium|low"
    }}
  ],
  "security_issues": [
    {{
      "line_number": <number or null>,
      "issue_type": "<type>",
      "description": "<description>",
      "severity": "critical|high|medium|low",
      "recommendation": "<how to fix>"
    }}
  ],
  "complexity_score": <0-100>,
  "maintainability_score": <0-100>,
  "overall_assessment": "<brief summary>"
}}"""
        
        try:
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Extract JSON from response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
                
            result = json.loads(response_text)
            result['file_path'] = file_path
            return result
        except Exception as e:
            logger.error(f"Error analyzing file {file_path}: {str(e)}")
            return {
                "file_path": file_path,
                "suggestions": [],
                "security_issues": [],
                "complexity_score": 50,
                "maintainability_score": 50,
                "overall_assessment": f"Analysis failed: {str(e)}"
            }
    
    async def analyze_multi_file_context(self, files: List[Dict[str, str]]) -> str:
        """Understand context across multiple files"""
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"multi-file-context-{uuid.uuid4()}",
            system_message="Analyze multiple code files to understand overall architecture and relationships."
        ).with_model("openai", "gpt-4o")
        
        files_summary = "\n\n".join([
            f"File: {f['path']}\n{f['content'][:500]}..." for f in files[:10]  # Limit context
        ])
        
        prompt = f"""Analyze these related code files and provide architectural context:

{files_summary}

Provide a brief summary of:
1. Overall architecture pattern
2. Key relationships between files
3. Potential architectural improvements"""
        
        try:
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            return response
        except Exception as e:
            logger.error(f"Error analyzing multi-file context: {str(e)}")
            return "Unable to analyze multi-file context."

# ============ GITHUB SERVICE ============

class GitHubService:
    def __init__(self, token: str):
        self.github = Github(token)
    
    def get_pr_details(self, repo_url: str, pr_number: int) -> Dict[str, Any]:
        """Fetch PR details from GitHub"""
        try:
            # Extract owner/repo from URL
            parts = repo_url.replace("https://github.com/", "").replace(".git", "").strip("/").split("/")
            repo_name = f"{parts[0]}/{parts[1]}"
            
            repo = self.github.get_repo(repo_name)
            pr = repo.get_pull(pr_number)
            
            files = []
            for file in pr.get_files():
                if file.status != "removed":
                    files.append({
                        "path": file.filename,
                        "content": file.patch or "",
                        "additions": file.additions,
                        "deletions": file.deletions
                    })
            
            return {
                "title": pr.title,
                "author": pr.user.login,
                "files": files,
                "repo": repo_name
            }
        except Exception as e:
            logger.error(f"Error fetching PR details: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to fetch PR: {str(e)}")

# ============ API ROUTES ============

analyzer = AICodeAnalyzer()

@api_router.get("/")
async def root():
    return {"message": "AI Code Review Assistant API", "version": "1.0"}

@api_router.post("/analyze-pr")
async def analyze_pull_request(request: AnalyzePRRequest):
    """Analyze a GitHub Pull Request"""
    try:
        # Create PR record
        pr_id = str(uuid.uuid4())
        
        # Fetch PR from GitHub
        github_service = GitHubService(request.github_token)
        pr_details = github_service.get_pr_details(request.repo_url, request.pr_number)
        
        # Save PR to database
        pr_obj = PullRequest(
            id=pr_id,
            repo=pr_details["repo"],
            pr_number=request.pr_number,
            title=pr_details["title"],
            author=pr_details["author"],
            status="analyzing",
            files_changed=[f["path"] for f in pr_details["files"]]
        )
        
        pr_dict = pr_obj.model_dump()
        pr_dict['created_at'] = pr_dict['created_at'].isoformat()
        await db.pull_requests.insert_one(pr_dict)
        
        # Get multi-file context
        context = await analyzer.analyze_multi_file_context(pr_details["files"])
        
        # Analyze each file
        all_suggestions = []
        all_security_issues = []
        total_complexity = 0
        total_maintainability = 0
        
        for file in pr_details["files"][:5]:  # Limit to 5 files for MVP
            analysis = await analyzer.analyze_code_file(
                file["path"],
                file["content"],
                context=context
            )
            
            # Add suggestions
            for sug in analysis.get("suggestions", []):
                all_suggestions.append(CodeSuggestion(
                    file_path=file["path"],
                    line_number=sug.get("line_number"),
                    suggestion=sug["suggestion"],
                    category=sug["category"],
                    severity=sug["severity"]
                ))
            
            # Add security issues
            for issue in analysis.get("security_issues", []):
                all_security_issues.append(SecurityIssue(
                    file_path=file["path"],
                    line_number=issue.get("line_number"),
                    issue_type=issue["issue_type"],
                    description=issue["description"],
                    severity=issue["severity"],
                    recommendation=issue["recommendation"]
                ))
            
            total_complexity += analysis.get("complexity_score", 50)
            total_maintainability += analysis.get("maintainability_score", 50)
        
        num_files = len(pr_details["files"][:5])
        avg_complexity = total_complexity / num_files if num_files > 0 else 50
        avg_maintainability = total_maintainability / num_files if num_files > 0 else 50
        overall_score = (avg_complexity + avg_maintainability) / 2
        
        # Create quality metrics
        quality_metrics = QualityMetric(
            pr_id=pr_id,
            complexity_score=avg_complexity,
            maintainability_score=avg_maintainability,
            overall_score=overall_score
        )
        
        # Create review summary
        summary = f"""Analyzed {num_files} files. Found {len(all_suggestions)} suggestions and {len(all_security_issues)} security issues. 
Overall Quality Score: {overall_score:.1f}/100"""
        
        # Save review
        review_obj = CodeReview(
            id=str(uuid.uuid4()),
            pr_id=pr_id,
            repo=pr_details["repo"],
            pr_number=request.pr_number,
            suggestions=all_suggestions,
            security_issues=all_security_issues,
            quality_metrics=quality_metrics,
            summary=summary,
            files_analyzed=num_files
        )
        
        review_dict = review_obj.model_dump()
        review_dict['timestamp'] = review_dict['timestamp'].isoformat()
        review_dict['quality_metrics']['timestamp'] = review_dict['quality_metrics']['timestamp'].isoformat()
        await db.code_reviews.insert_one(review_dict)
        
        # Update PR status
        await db.pull_requests.update_one(
            {"id": pr_id},
            {"$set": {"status": "completed", "review_id": review_obj.id}}
        )
        
        return {
            "success": True,
            "pr_id": pr_id,
            "review_id": review_obj.id,
            "message": "Analysis completed successfully"
        }
        
    except Exception as e:
        logger.error(f"Error analyzing PR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reviews")
async def get_all_reviews():
    """Get all code reviews"""
    reviews = await db.code_reviews.find({}, {"_id": 0}).to_list(1000)
    for review in reviews:
        if isinstance(review.get('timestamp'), str):
            review['timestamp'] = datetime.fromisoformat(review['timestamp'])
    return reviews

@api_router.get("/reviews/{review_id}")
async def get_review_by_id(review_id: str):
    """Get specific review details"""
    review = await db.code_reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review

@api_router.get("/pull-requests")
async def get_all_pull_requests():
    """Get all pull requests"""
    prs = await db.pull_requests.find({}, {"_id": 0}).to_list(1000)
    for pr in prs:
        if isinstance(pr.get('created_at'), str):
            pr['created_at'] = datetime.fromisoformat(pr['created_at'])
    return prs

@api_router.get("/metrics")
async def get_quality_metrics():
    """Get quality metrics over time"""
    reviews = await db.code_reviews.find({}, {"_id": 0}).to_list(1000)
    metrics = []
    for review in reviews:
        metrics.append({
            "pr_id": review["pr_id"],
            "repo": review["repo"],
            "timestamp": review["timestamp"],
            "complexity_score": review["quality_metrics"]["complexity_score"],
            "maintainability_score": review["quality_metrics"]["maintainability_score"],
            "overall_score": review["quality_metrics"]["overall_score"]
        })
    return metrics

@api_router.get("/security-issues")
async def get_all_security_issues():
    """Get all security issues"""
    reviews = await db.code_reviews.find({}, {"_id": 0}).to_list(1000)
    all_issues = []
    for review in reviews:
        for issue in review.get("security_issues", []):
            all_issues.append({
                **issue,
                "pr_id": review["pr_id"],
                "repo": review["repo"],
                "pr_number": review["pr_number"]
            })
    return all_issues

@api_router.get("/dashboard-stats")
async def get_dashboard_stats():
    """Get overall statistics for dashboard"""
    total_prs = await db.pull_requests.count_documents({})
    total_reviews = await db.code_reviews.count_documents({})
    
    reviews = await db.code_reviews.find({}, {"_id": 0}).to_list(1000)
    total_suggestions = sum(len(r.get("suggestions", [])) for r in reviews)
    total_security_issues = sum(len(r.get("security_issues", [])) for r in reviews)
    
    avg_quality_score = 0
    if reviews:
        avg_quality_score = sum(r["quality_metrics"]["overall_score"] for r in reviews) / len(reviews)
    
    return {
        "total_prs_analyzed": total_prs,
        "total_reviews": total_reviews,
        "total_suggestions": total_suggestions,
        "total_security_issues": total_security_issues,
        "average_quality_score": round(avg_quality_score, 1)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()