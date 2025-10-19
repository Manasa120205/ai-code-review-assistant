# 🤖 AI-Powered Code Review Assistant

A comprehensive tool that integrates with GitHub pull requests and provides intelligent, AI-driven code review suggestions. Goes beyond basic linting to understand context, suggest architectural improvements, and flag potential security issues.

## ✨ Features

### 🎯 Core Capabilities
- **Intelligent Code Analysis**: AI-powered analysis using GPT-4 to understand code context
- **GitHub Integration**: Seamlessly analyzes GitHub pull requests
- **Security Scanning**: Detects potential security vulnerabilities with severity levels
- **Architecture Suggestions**: Provides architectural improvement recommendations
- **Quality Metrics**: Tracks code quality over time with complexity and maintainability scores
- **Multi-file Context**: Understands relationships across multiple files
- **Beautiful Dashboard**: Interactive UI with charts and visualizations

### 🔍 Analysis Categories
1. **Architectural Improvements** - Design patterns and structure enhancements
2. **Security Issues** - Vulnerability detection with fix recommendations
3. **Performance Optimizations** - Code efficiency suggestions
4. **Maintainability** - Code readability and maintainability improvements
5. **Best Practices** - Industry standard compliance checks

## 🚀 Getting Started

### Prerequisites
- GitHub Personal Access Token
- Repository URL and PR number you want to analyze

### How to Get GitHub Token
1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name and select scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
4. Click "Generate token"
5. Copy the token (starts with `ghp_`)

## 📖 How to Use

### 1. **Dashboard** 
View overall statistics and metrics:
- Total PRs analyzed
- Total suggestions generated
- Security issues found
- Average quality score
- Quality metrics trends over time

### 2. **Analyze PR**
Submit a new pull request for analysis:
1. Enter the GitHub repository URL (e.g., `https://github.com/owner/repo`)
2. Enter the PR number (e.g., `123`)
3. Enter your GitHub Personal Access Token
4. Click "Analyze Pull Request"
5. Wait for AI analysis to complete (usually 30-60 seconds)

### 3. **Reviews**
View all completed code reviews:
- See all analyzed pull requests
- View summary statistics for each review
- Click on any review to see detailed analysis

### 4. **Review Details**
Deep dive into specific review:
- **Quality Scores**: Overall score, complexity, and maintainability
- **Code Suggestions**: Categorized by severity and type
- **Security Issues**: Critical vulnerabilities with recommendations

### 5. **Security**
View all security issues across all reviews

## 🏗️ Technical Architecture

### Backend (FastAPI + Python)
- **AI Engine**: Uses GPT-4 via Emergent LLM Key for code analysis
- **GitHub Integration**: PyGithub library for PR fetching
- **Database**: MongoDB for storing reviews and metrics

### Frontend (React)
- **UI Framework**: React with Hooks
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS

## 📊 What the AI Analyzes

### Code Quality Metrics
- **Complexity Score** (0-100): How complex the code is
- **Maintainability Score** (0-100): How easy it is to maintain
- **Overall Score** (0-100): Combined quality assessment

### Security Severity Levels
- **Critical**: Immediate action required
- **High**: Important security concern
- **Medium**: Should be addressed soon
- **Low**: Minor security consideration

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, AsyncIO
- **AI**: OpenAI GPT-4 (via Emergent LLM Key)
- **Database**: MongoDB
- **Frontend**: React, Tailwind CSS, Recharts
- **GitHub**: PyGithub, GitHub API

---

**Built with ❤️ using AI-powered code analysis**
