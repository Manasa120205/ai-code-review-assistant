import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, GitPullRequest, Shield, TrendingUp, AlertTriangle, CheckCircle, FileCode, Github } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [pullRequests, setPullRequests] = useState([]);
  const [securityIssues, setSecurityIssues] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Form states
  const [repoUrl, setRepoUrl] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, reviewsRes, prsRes, securityRes, metricsRes] = await Promise.all([
        axios.get(`${API}/dashboard-stats`),
        axios.get(`${API}/reviews`),
        axios.get(`${API}/pull-requests`),
        axios.get(`${API}/security-issues`),
        axios.get(`${API}/metrics`)
      ]);
      
      setStats(statsRes.data);
      setReviews(reviewsRes.data);
      setPullRequests(prsRes.data);
      setSecurityIssues(securityRes.data);
      setMetrics(metricsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzePR = async (e) => {
    e.preventDefault();
    if (!repoUrl || !prNumber || !githubToken) {
      alert('Please fill all fields');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await axios.post(`${API}/analyze-pr`, {
        repo_url: repoUrl,
        pr_number: parseInt(prNumber),
        github_token: githubToken
      });
      
      alert('Analysis completed! Check the reviews tab.');
      await fetchDashboardData();
      setRepoUrl('');
      setPrNumber('');
    } catch (error) {
      console.error('Error analyzing PR:', error);
      alert('Error analyzing PR: ' + (error.response?.data?.detail || error.message));
    } finally {
      setAnalyzing(false);
    }
  };

  const viewReviewDetails = async (reviewId) => {
    try {
      const response = await axios.get(`${API}/reviews/${reviewId}`);
      setSelectedReview(response.data);
      setActiveTab('review-details');
    } catch (error) {
      console.error('Error fetching review details:', error);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500" data-testid="stat-card-prs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">PRs Analyzed</p>
              <p className="text-3xl font-bold text-gray-800">{stats?.total_prs_analyzed || 0}</p>
            </div>
            <GitPullRequest className="text-blue-500" size={40} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500" data-testid="stat-card-suggestions">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Suggestions</p>
              <p className="text-3xl font-bold text-gray-800">{stats?.total_suggestions || 0}</p>
            </div>
            <CheckCircle className="text-green-500" size={40} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500" data-testid="stat-card-security">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Security Issues</p>
              <p className="text-3xl font-bold text-gray-800">{stats?.total_security_issues || 0}</p>
            </div>
            <Shield className="text-red-500" size={40} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500" data-testid="stat-card-quality">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Quality Score</p>
              <p className="text-3xl font-bold text-gray-800">{stats?.average_quality_score || 0}</p>
            </div>
            <TrendingUp className="text-purple-500" size={40} />
          </div>
        </div>
      </div>

      {/* Quality Metrics Chart */}
      {metrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6" data-testid="quality-metrics-chart">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <TrendingUp className="mr-2" /> Quality Metrics Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="pr_id" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="overall_score" stroke="#8884d8" name="Overall Score" />
              <Line type="monotone" dataKey="complexity_score" stroke="#82ca9d" name="Complexity" />
              <Line type="monotone" dataKey="maintainability_score" stroke="#ffc658" name="Maintainability" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Reviews */}
      <div className="bg-white rounded-lg shadow-lg p-6" data-testid="recent-reviews">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <FileCode className="mr-2" /> Recent Code Reviews
        </h3>
        <div className="space-y-3">
          {reviews.slice(0, 5).map((review) => (
            <div key={review.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => viewReviewDetails(review.id)} data-testid={`review-item-${review.id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{review.repo} - PR #{review.pr_number}</p>
                  <p className="text-sm text-gray-600">{review.summary}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Score: {review.quality_metrics.overall_score.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalyze = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8" data-testid="analyze-pr-form">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Github className="mr-2" /> Analyze GitHub Pull Request
        </h2>
        
        <form onSubmit={handleAnalyzePR} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repository URL
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="repo-url-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pull Request Number
            </label>
            <input
              type="number"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              placeholder="123"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="pr-number-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="github-token-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Need a token? <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Create one here</a>
            </p>
          </div>
          
          <button
            type="submit"
            disabled={analyzing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            data-testid="analyze-button"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Pull Request'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-4" data-testid="reviews-list">
      <h2 className="text-2xl font-bold mb-4">All Code Reviews</h2>
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-lg shadow-lg p-6" data-testid={`review-card-${review.id}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold">{review.repo} - PR #{review.pr_number}</h3>
              <p className="text-gray-600 mt-1">{review.summary}</p>
            </div>
            <span className="px-4 py-2 rounded-full text-sm bg-blue-100 text-blue-800">
              Score: {review.quality_metrics.overall_score.toFixed(1)}/100
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">{review.suggestions.length}</p>
              <p className="text-sm text-gray-600">Suggestions</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded">
              <p className="text-2xl font-bold text-red-600">{review.security_issues.length}</p>
              <p className="text-sm text-gray-600">Security Issues</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-600">{review.files_analyzed}</p>
              <p className="text-sm text-gray-600">Files Analyzed</p>
            </div>
          </div>
          
          <button
            onClick={() => viewReviewDetails(review.id)}
            className="text-blue-600 hover:underline font-medium"
            data-testid={`view-details-button-${review.id}`}
          >
            View Detailed Review →
          </button>
        </div>
      ))}
    </div>
  );

  const renderReviewDetails = () => {
    if (!selectedReview) return null;

    return (
      <div className="space-y-6" data-testid="review-details">
        <button
          onClick={() => setActiveTab('reviews')}
          className="text-blue-600 hover:underline mb-4"
          data-testid="back-to-reviews-button"
        >
          ← Back to Reviews
        </button>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-2">{selectedReview.repo} - PR #{selectedReview.pr_number}</h2>
          <p className="text-gray-600 mb-4">{selectedReview.summary}</p>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-purple-50 rounded">
              <p className="text-3xl font-bold text-purple-600">{selectedReview.quality_metrics.overall_score.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Overall Score</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded">
              <p className="text-3xl font-bold text-blue-600">{selectedReview.quality_metrics.complexity_score.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Complexity</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <p className="text-3xl font-bold text-green-600">{selectedReview.quality_metrics.maintainability_score.toFixed(1)}</p>
              <p className="text-sm text-gray-600">Maintainability</p>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        {selectedReview.suggestions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6" data-testid="suggestions-section">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <CheckCircle className="mr-2 text-green-500" /> Code Suggestions ({selectedReview.suggestions.length})
            </h3>
            <div className="space-y-4">
              {selectedReview.suggestions.map((sug, idx) => (
                <div key={idx} className="border-l-4 border-green-500 pl-4 py-2" data-testid={`suggestion-${idx}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      sug.severity === 'high' ? 'bg-red-100 text-red-800' :
                      sug.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {sug.severity.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">{sug.category}</span>
                    <span className="text-sm text-gray-500">{sug.file_path}</span>
                  </div>
                  <p className="text-gray-800">{sug.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Issues */}
        {selectedReview.security_issues.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6" data-testid="security-issues-section">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-red-500" /> Security Issues ({selectedReview.security_issues.length})
            </h3>
            <div className="space-y-4">
              {selectedReview.security_issues.map((issue, idx) => (
                <div key={idx} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50" data-testid={`security-issue-${idx}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      issue.severity === 'critical' ? 'bg-red-600 text-white' :
                      issue.severity === 'high' ? 'bg-red-500 text-white' :
                      issue.severity === 'medium' ? 'bg-orange-500 text-white' :
                      'bg-yellow-500 text-white'
                    }`}>
                      {issue.severity.toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-red-700">{issue.issue_type}</span>
                    <span className="text-sm text-gray-600">{issue.file_path}</span>
                  </div>
                  <p className="text-gray-800 font-medium mb-1">{issue.description}</p>
                  <p className="text-sm text-gray-700">💡 {issue.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSecurity = () => (
    <div className="space-y-4" data-testid="security-issues-list">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <Shield className="mr-2" /> All Security Issues
      </h2>
      {securityIssues.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Shield className="mx-auto mb-4 text-green-500" size={64} />
          <p className="text-xl text-gray-600">No security issues found! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {securityIssues.map((issue, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-red-500" data-testid={`security-issue-card-${idx}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`px-3 py-1 rounded text-xs font-semibold mr-2 ${
                    issue.severity === 'critical' ? 'bg-red-600 text-white' :
                    issue.severity === 'high' ? 'bg-red-500 text-white' :
                    issue.severity === 'medium' ? 'bg-orange-500 text-white' :
                    'bg-yellow-500 text-white'
                  }`}>
                    {issue.severity.toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold">{issue.issue_type}</span>
                </div>
                <span className="text-sm text-gray-500">{issue.repo} - PR #{issue.pr_number}</span>
              </div>
              <p className="text-gray-800 mb-2">{issue.description}</p>
              <p className="text-sm text-gray-600">📁 {issue.file_path}</p>
              <p className="text-sm text-green-700 mt-2">💡 {issue.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold flex items-center" data-testid="app-header">
            <Activity className="mr-3" size={36} />
            AI-Powered Code Review Assistant
          </h1>
          <p className="text-blue-100 mt-2">Intelligent code analysis with AI-driven insights</p>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-md" data-testid="main-navigation">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8 py-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="nav-dashboard"
            >
              <Activity className="mr-2" size={20} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('analyze')}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'analyze' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="nav-analyze"
            >
              <Github className="mr-2" size={20} />
              Analyze PR
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'reviews' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="nav-reviews"
            >
              <FileCode className="mr-2" size={20} />
              Reviews
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'security' ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid="nav-security"
            >
              <Shield className="mr-2" size={20} />
              Security
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading && activeTab !== 'analyze' ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'analyze' && renderAnalyze()}
            {activeTab === 'reviews' && renderReviews()}
            {activeTab === 'review-details' && renderReviewDetails()}
            {activeTab === 'security' && renderSecurity()}
          </>
        )}
      </main>
    </div>
  );
}

export default App;