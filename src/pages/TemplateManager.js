import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { AuthContext } from "../context/AuthContext";
import TemplateForm from "../components/TemplateForm";
import TemplatePreview from "../components/TemplatePreview";
import {
  PlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  CalendarIcon,
  CloudIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  EyeIcon,
  ChatBubbleBottomCenterTextIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const TemplateManager = () => {
  const { authToken } = useContext(AuthContext);
  const token = authToken || localStorage.getItem("authToken");

  const [wabaAccounts, setWabaAccounts] = useState([]);
  const [selectedWabaId, setSelectedWabaId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Views: 'list', 'create', 'details'
  const [view, setView] = useState("list");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editTemplateId, setEditTemplateId] = useState(null);
  const [formError, setFormError] = useState("");

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("all"); // Default to 'all' so historical + recent data shows immediately

  const getDateRangeLabel = (range) => {
    switch (String(range)) {
      case "7":
        return "Last 7 days";
      case "30":
        return "Last 30 days";
      case "60":
        return "Last 60 days";
      case "90":
        return "Last 90 days";
      default:
        return "All time";
    }
  };

  // 1. Fetch WABA Accounts on mount
  useEffect(() => {
    if (!token) return;
    const fetchWabas = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/waba/accounts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const accounts = res.data?.data || [];
        setWabaAccounts(accounts);
        if (accounts.length > 0) {
          setSelectedWabaId(accounts[0].businessAccountId);
        }
      } catch (err) {
        console.error("Error fetching WABAs:", err);
      }
    };
    fetchWabas();
  }, [token]);

  // 2. Fetch Templates + Merged Meta/DB Analytics
  const fetchTemplates = useCallback(async () => {
    if (!selectedWabaId || !token) return;
    setLoading(true);
    try {
      const params = { days: dateRange };
      if (dateRange !== "all") {
        const daysNum = parseInt(dateRange, 10) || 30;
        const end = Math.floor(Date.now() / 1000);
        const start = end - daysNum * 24 * 60 * 60;
        params.start = start;
        params.end = end;
      }

      const res = await axios.get(
        `${API_URL}/api/templates/${selectedWabaId}`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const fetched = res.data?.data || [];
      setTemplates(fetched);

      // Keep selectedTemplate updated if user is in details view
      setSelectedTemplate((prev) => {
        if (!prev) return prev;
        const updated = fetched.find(
          (t) => t.id === prev.id || t.name === prev.name
        );
        return updated || prev;
      });
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedWabaId, dateRange, token]);

  useEffect(() => {
    if (selectedWabaId) {
      fetchTemplates();
    }
  }, [selectedWabaId, dateRange, fetchTemplates]);

  // 3. Fetch Detailed Time-Series & Summary Analytics for a Single Template
  const fetchTemplateAnalytics = useCallback(async () => {
    if (!selectedWabaId || !selectedTemplate || !token) return;
    setLoadingAnalytics(true);
    try {
      const params = {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        days: dateRange,
      };
      if (dateRange !== "all") {
        const daysNum = parseInt(dateRange, 10) || 30;
        const end = Math.floor(Date.now() / 1000);
        const start = end - daysNum * 24 * 60 * 60;
        params.start = start;
        params.end = end;
      }

      const res = await axios.get(
        `${API_URL}/api/templates/${selectedWabaId}/analytics`,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAnalyticsData(res.data?.data || []);
      setAnalyticsSummary(res.data?.summary || null);
    } catch (err) {
      console.error("Error fetching template analytics:", err);
      setAnalyticsData([]);
      setAnalyticsSummary(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [selectedWabaId, selectedTemplate, dateRange, token]);

  useEffect(() => {
    if (view === "details" && selectedTemplate && selectedWabaId) {
      fetchTemplateAnalytics();
    }
  }, [view, selectedTemplate, selectedWabaId, dateRange, fetchTemplateAnalytics]);

  // Handle Create / Edit Template Form Submission via TemplateForm
  const handleFormSubmit = async (formData) => {
    setLoading(true);
    setFormError("");
    try {
      if (editTemplateId) {
        await axios.put(
          `${API_URL}/api/templates/${editTemplateId}`,
          { wabaId: selectedWabaId, components: formData.components },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_URL}/api/templates`,
          { wabaId: selectedWabaId, ...formData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setView("list");
      setEditTemplateId(null);
      setFormError("");
      fetchTemplates();
    } catch (err) {
      setFormError(
        err.response?.data?.error || "Failed to save template."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template, e) => {
    if (e) e.stopPropagation();
    setEditTemplateId(template.id);
    setFormError("");
    setView("create");
  };

  // Client-side Filtering
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "ALL" || t.category === categoryFilter;
    const matchesLanguage =
      languageFilter === "ALL" || t.language === languageFilter;
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesCategory && matchesLanguage && matchesStatus;
  });

  // Extract unique languages from loaded templates for filter dropdown
  const availableLanguages = Array.from(
    new Set([
      "en",
      "en_US",
      "ar",
      ...templates.map((t) => t.language).filter(Boolean),
    ])
  );

  const renderStatusBadge = (status) => {
    let classes = "bg-slate-100 text-slate-700 border-slate-200";
    let dotColor = "bg-slate-400";
    let text = status;

    if (status === "APPROVED") {
      classes = "bg-emerald-50 text-emerald-700 border-emerald-200";
      dotColor = "bg-emerald-500";
      text = "Active - Quality pending";
    } else if (status === "REJECTED") {
      classes = "bg-rose-50 text-rose-700 border-rose-200";
      dotColor = "bg-rose-500";
      text = "Rejected";
    } else if (status === "PENDING") {
      classes = "bg-amber-50 text-amber-700 border-amber-200";
      dotColor = "bg-amber-500";
      text = "In Review";
    } else if (status === "PAUSED") {
      classes = "bg-orange-50 text-orange-700 border-orange-200";
      dotColor = "bg-orange-500";
      text = "Paused";
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${classes}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
        {text}
      </span>
    );
  };

  const renderCategoryPill = (cat) => {
    const styles = {
      MARKETING: "bg-indigo-50 text-indigo-700 border-indigo-100",
      UTILITY: "bg-sky-50 text-sky-700 border-sky-100",
      AUTHENTICATION: "bg-purple-50 text-purple-700 border-purple-100",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
          styles[cat] || "bg-slate-50 text-slate-600 border-slate-200"
        }`}
      >
        {cat}
      </span>
    );
  };

  // Summary metrics across filtered templates in List View
  const totalTemplatesCount = filteredTemplates.length;
  const totalSentAll = filteredTemplates.reduce(
    (acc, t) => acc + (t.messages_sent || 0),
    0
  );
  const totalDeliveredAll = filteredTemplates.reduce(
    (acc, t) => acc + (t.messages_delivered || 0),
    0
  );
  const totalReadAll = filteredTemplates.reduce(
    (acc, t) => acc + (t.messages_read || 0),
    0
  );
  const totalRepliesAll = filteredTemplates.reduce(
    (acc, t) => acc + (t.unique_replies || 0),
    0
  );

  // Metrics for selected template in Details View
  const detailSent =
    analyticsSummary?.sent ?? selectedTemplate?.messages_sent ?? 0;
  const detailDelivered =
    analyticsSummary?.delivered ?? selectedTemplate?.messages_delivered ?? 0;
  const detailRead =
    analyticsSummary?.read ?? selectedTemplate?.messages_read ?? 0;
  const detailReplies =
    analyticsSummary?.replies ?? selectedTemplate?.unique_replies ?? 0;
  const detailFailed =
    analyticsSummary?.failed ?? selectedTemplate?.messages_failed ?? 0;
  const detailSkipped =
    analyticsSummary?.skipped ?? selectedTemplate?.messages_skipped ?? 0;
  const detailCampaignsCount =
    analyticsSummary?.campaignsCount ?? selectedTemplate?.campaigns_count ?? 0;
  const detailReadRate =
    analyticsSummary?.readRate ??
    selectedTemplate?.read_rate_num ??
    (detailDelivered > 0 ? Math.round((detailRead / detailDelivered) * 100) : 0);
  const detailDeliveryRate =
    analyticsSummary?.deliveryRate ??
    (detailSent > 0 ? Math.round((detailDelivered / detailSent) * 100) : 0);
  const detailReplyRate =
    analyticsSummary?.replyRate ??
    (detailDelivered > 0
      ? Math.min(100, Math.round((detailReplies / detailDelivered) * 100))
      : 0);
  const detailAmountSpent =
    analyticsSummary?.amountSpent || selectedTemplate?.amount_spent || null;
  const detailCostPerDelivered = analyticsSummary?.costPerDelivered || null;
  const detailHeaderImage = selectedTemplate?.headerImageUrl || null;

  return (
    <div className="min-h-screen bg-slate-50/80 p-4 md:p-6 font-sans text-slate-800">
      {/* LIST VIEW */}
      {view === "list" && (
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Message Templates
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Create, manage, and track performance of your WhatsApp Cloud API templates
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchTemplates}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 text-slate-500 ${
                    loading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
              <button
                onClick={() => {
                  setEditTemplateId(null);
                  setFormError("");
                  setView("create");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                Create template
              </button>
            </div>
          </div>

          {/* Top Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Templates
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {totalTemplatesCount}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Messages Sent
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {totalSentAll.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Delivered
              </div>
              <div className="text-2xl font-bold text-indigo-600 mt-1">
                {totalDeliveredAll.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Messages Read
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {totalReadAll.toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Total Replies
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {totalRepliesAll.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Filter & Action Toolbar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left side: WABA + Search */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
                {/* WABA Selector */}
                <select
                  className="h-10 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={selectedWabaId}
                  onChange={(e) => {
                    setSelectedWabaId(e.target.value);
                    setTemplates([]);
                  }}
                >
                  {wabaAccounts.map((w) => (
                    <option
                      key={w.businessAccountId}
                      value={w.businessAccountId}
                    >
                      {w.accountName || w.businessAccountId}
                    </option>
                  ))}
                </select>

                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search templates by name..."
                    className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Right side: Filters + Date Range */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>

                <select
                  className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                >
                  <option value="ALL">All Languages</option>
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>

                <select
                  className="h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                </select>

                <div className="relative flex items-center">
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <select
                    className="h-10 pl-9 pr-3 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <option value="all">All time</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="60">Last 60 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 pl-5 pr-3">Template Name</th>
                    <th className="py-3.5 px-3">Category</th>
                    <th className="py-3.5 px-3">Language</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-right">Sent</th>
                    <th className="py-3.5 px-3 text-right">Delivered</th>
                    <th className="py-3.5 px-3 text-right">Read Rate</th>
                    <th className="py-3.5 px-3 text-right">Replies</th>
                    <th className="py-3.5 px-3">Last Edited</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="text-center py-16 text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-600" />
                          <span>Loading templates & analytics...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTemplates.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="text-center py-16 text-slate-400"
                      >
                        No templates found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTemplates.map((t) => {
                      const bodyComp = t.components?.find(
                        (c) => c.type === "BODY"
                      );
                      const bodyPreview = bodyComp?.text || "";
                      const sentCount = t.messages_sent || 0;
                      const delivCount = t.messages_delivered || 0;
                      const readCount = t.messages_read || 0;
                      const readRateNum =
                        t.read_rate_num ??
                        (typeof t.read_rate === "number"
                          ? t.read_rate
                          : parseInt(String(t.read_rate || "0"), 10) || 0);
                      const repliesCount = t.unique_replies || 0;

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-blue-50/40 cursor-pointer group transition-colors"
                          onClick={() => {
                            setSelectedTemplate(t);
                            setView("details");
                          }}
                        >
                          <td className="py-3.5 pl-5 pr-3 max-w-xs">
                            <div className="font-semibold text-blue-600 group-hover:text-blue-700 group-hover:underline truncate">
                              {t.name}
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                              <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                              <span className="truncate">{bodyPreview}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {renderCategoryPill(t.category)}
                          </td>
                          <td className="py-3.5 px-3 text-slate-600 font-medium whitespace-nowrap">
                            {t.language}
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {renderStatusBadge(t.status)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {sentCount.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <span className="font-semibold text-slate-800">
                              {delivCount.toLocaleString()}
                            </span>
                            {sentCount > 0 && (
                              <span className="text-xs text-slate-400 ml-1">
                                (
                                {t.delivery_rate ||
                                  `${Math.round(
                                    (delivCount / sentCount) * 100
                                  )}%`}
                                )
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={`font-semibold ${
                                  readRateNum >= 50
                                    ? "text-emerald-600"
                                    : readRateNum > 0
                                    ? "text-blue-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {readRateNum}%
                              </span>
                              {readCount > 0 && (
                                <span className="text-xs text-slate-400">
                                  ({readCount.toLocaleString()})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            {repliesCount > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                {repliesCount.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-slate-500 text-xs whitespace-nowrap">
                            {t.last_updated_time
                              ? new Date(
                                  t.last_updated_time
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "--"}
                          </td>
                          <td
                            className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => handleEditTemplate(t, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit Template"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS / INSIGHTS VIEW */}
      {view === "details" && selectedTemplate && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Back Navigation */}
          <div>
            <button
              onClick={() => setView("list")}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to templates
            </button>
          </div>

          {/* Template Header Card */}
          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {selectedTemplate.name}
                  </h1>
                  {renderStatusBadge(selectedTemplate.status)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5">
                  {renderCategoryPill(selectedTemplate.category)}
                  <span>•</span>
                  <span className="font-medium text-slate-600">
                    Language: {selectedTemplate.language}
                  </span>
                  <span>•</span>
                  <span>
                    Updated{" "}
                    {selectedTemplate.last_updated_time
                      ? new Date(
                          selectedTemplate.last_updated_time
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recently"}
                  </span>
                  {detailCampaignsCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 font-semibold">
                        Used in {detailCampaignsCount} campaign
                        {detailCampaignsCount > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Toolbar: Cloud API badge, Date Range selector, Refresh, Edit */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200">
                <CloudIcon className="w-4 h-4 text-slate-500" />
                Cloud API
              </div>

              <div className="relative flex items-center">
                <CalendarIcon className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
                <select
                  className="h-9 pl-9 pr-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="all">All time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="60">Last 60 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              <button
                onClick={fetchTemplateAnalytics}
                disabled={loadingAnalytics}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all"
                title="Refresh Insights"
              >
                <ArrowPathIcon
                  className={`w-4 h-4 text-slate-500 ${
                    loadingAnalytics ? "animate-spin" : ""
                  }`}
                />
                Sync
              </button>

              <button
                onClick={(e) => handleEditTemplate(selectedTemplate, e)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Edit template
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-xs sm:text-sm text-slate-700">
                Showing combined{" "}
                <span className="font-semibold text-slate-900">
                  Meta Graph API + Campaign Delivery & Reply Insights
                </span>{" "}
                for{" "}
                <span className="font-semibold text-blue-700">
                  {getDateRangeLabel(dateRange)}
                </span>
                .
              </p>
            </div>
            {detailAmountSpent && (
              <div className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-blue-100 whitespace-nowrap">
                Meta Spend: {detailAmountSpent}
                {detailCostPerDelivered ? ` (${detailCostPerDelivered}/msg)` : ""}
              </div>
            )}
          </div>

          {/* Main Content: Left Phone Preview + Right Performance Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Template Preview */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center justify-between">
                  <span>Your template</span>
                  <span className="text-xs font-normal text-slate-400">
                    WhatsApp Preview
                  </span>
                </h3>
                <TemplatePreview
                  template={selectedTemplate}
                  headerMediaUrl={detailHeaderImage}
                />
              </div>
            </div>

            {/* Right Column: Performance & Analytics */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">
                      Performance Overview
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time delivery, engagement, and customer response metrics
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    {getDateRangeLabel(dateRange)}
                  </span>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  {/* Messages Sent */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span>Messages Sent</span>
                      <PaperAirplaneIcon className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {detailSent.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Total dispatched messages
                    </div>
                  </div>

                  {/* Messages Delivered */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span>Delivered</span>
                      <CheckCircleIcon className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-indigo-600">
                        {detailDelivered.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {detailDeliveryRate}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Reached recipient device
                    </div>
                  </div>

                  {/* Messages Read */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span>Messages Read</span>
                      <EyeIcon className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-600">
                        {detailRead.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {detailReadRate}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Opened by recipient
                    </div>
                  </div>

                  {/* Unique Replies */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span>Unique Replies</span>
                      <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-amber-600">
                        {detailReplies.toLocaleString()}
                      </span>
                      {detailDelivered > 0 && (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          {detailReplyRate}% CTR
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Customer responses received
                    </div>
                  </div>

                  {/* Failed / Skipped */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span>Failed / Skipped</span>
                      <ExclamationTriangleIcon className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-rose-600">
                        {detailFailed.toLocaleString()}
                      </span>
                      {detailSkipped > 0 && (
                        <span className="text-xs text-slate-500">
                          / {detailSkipped.toLocaleString()} skipped
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Undelivered or excluded
                    </div>
                  </div>

                  {/* Amount Spent / Campaigns */}
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      <span>
                        {detailAmountSpent ? "Amount Spent" : "Campaigns Run"}
                      </span>
                      <SparklesIcon className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {detailAmountSpent
                        ? detailAmountSpent
                        : detailCampaignsCount}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {detailCostPerDelivered
                        ? `Avg ${detailCostPerDelivered} per message`
                        : "Broadcast campaigns using template"}
                    </div>
                  </div>
                </div>

                {/* Delivery & Engagement Trend Chart */}
                <div className="border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-800">
                      Delivery & Engagement Timeline
                    </h4>
                  </div>

                  <div className="h-80 w-full">
                    {loadingAnalytics ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                        <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="text-sm">
                          Loading performance chart...
                        </span>
                      </div>
                    ) : analyticsData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                        <ChatBubbleLeftRightIcon className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-600">
                          No timeline activity recorded for this period
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Try switching the date range filter to "All time" or send a campaign with this template.
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={analyticsData}
                          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorSent"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#3b82f6"
                                stopOpacity={0.2}
                              />
                              <stop
                                offset="95%"
                                stopColor="#3b82f6"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="colorDelivered"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#6366f1"
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="95%"
                                stopColor="#6366f1"
                                stopOpacity={0}
                              />
                            </linearGradient>
                            <linearGradient
                              id="colorRead"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#10b981"
                                stopOpacity={0.25}
                              />
                              <stop
                                offset="95%"
                                stopColor="#10b981"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 12, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 8px 24px -4px rgba(0,0,0,0.08)",
                              fontSize: "12px",
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                          />
                          <Area
                            type="monotone"
                            dataKey="sent"
                            name="Messages sent"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorSent)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="delivered"
                            name="Messages delivered"
                            stroke="#6366f1"
                            fillOpacity={1}
                            fill="url(#colorDelivered)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="read"
                            name="Messages read"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorRead)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="replies"
                            name="Unique replies"
                            stroke="#f59e0b"
                            fillOpacity={0}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT VIEW */}
      {view === "create" && (
        <div className="max-w-7xl mx-auto">
          <TemplateForm
            initialData={
              editTemplateId
                ? templates.find((t) => t.id === editTemplateId)
                : null
            }
            wabaId={selectedWabaId}
            authToken={token}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setView("list");
              setEditTemplateId(null);
            }}
            loading={loading}
            error={formError}
          />
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
