import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../config";
import TemplatePreview from "../components/TemplatePreview";
import {
  PlusIcon,
  TrashIcon,
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
  const [wabas, setWabas] = useState([]);
  const [selectedWaba, setSelectedWaba] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Views: 'list', 'create', 'details'
  const [view, setView] = useState("list");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("all"); // Default to 'all' so all historical + recent data shows immediately

  // Form States for Create/Edit
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en_US");
  const [headerType, setHeaderType] = useState("NONE");
  const [headerText, setHeaderText] = useState("");
  const [headerMediaFile, setHeaderMediaFile] = useState(null);
  const [headerPreviewUrl, setHeaderPreviewUrl] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [bodyText, setBodyText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState([]);
  const [sampleValues, setSampleValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Carousel States
  const [isCarousel, setIsCarousel] = useState(false);
  const [carouselCards, setCarouselCards] = useState([]);

  const token = localStorage.getItem("token");

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

  // Fetch WABAs on mount
  useEffect(() => {
    const fetchWabas = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/waba`, {
          headers: { "x-auth-token": token },
        });
        setWabas(res.data);
        if (res.data.length > 0) {
          setSelectedWaba(res.data[0].wabaId);
        }
      } catch (err) {
        console.error("Error fetching WABAs:", err);
      }
    };
    fetchWabas();
  }, [token]);

  const fetchTemplates = useCallback(async () => {
    if (!selectedWaba) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/templates/${selectedWaba}`, {
        params: { days: dateRange },
        headers: { "x-auth-token": token },
      });
      const fetched = res.data.data || [];
      setTemplates(fetched);
      // Keep selectedTemplate in sync if currently viewing details
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
  }, [selectedWaba, dateRange, token]);

  // Fetch Templates when WABA or DateRange changes
  useEffect(() => {
    if (selectedWaba) {
      fetchTemplates();
    }
  }, [selectedWaba, dateRange, fetchTemplates]);

  // Fetch Detailed Analytics when viewing template details
  const fetchTemplateAnalytics = useCallback(async () => {
    if (!selectedWaba || !selectedTemplate) return;
    setLoadingAnalytics(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/templates/${selectedWaba}/analytics`,
        {
          params: {
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
            days: dateRange,
          },
          headers: { "x-auth-token": token },
        }
      );
      setAnalyticsData(res.data.data || []);
      setAnalyticsSummary(res.data.summary || null);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setAnalyticsData([]);
      setAnalyticsSummary(null);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [selectedWaba, selectedTemplate, dateRange, token]);

  useEffect(() => {
    if (view === "details" && selectedTemplate) {
      fetchTemplateAnalytics();
    }
  }, [view, selectedTemplate, dateRange, fetchTemplateAnalytics]);

  const handleEditTemplate = (template) => {
    setName(template.name);
    setCategory(template.category);
    setLanguage(template.language);

    setHeaderType("NONE");
    setHeaderText("");
    setHeaderMediaFile(null);
    setHeaderPreviewUrl(template.headerImageUrl || null);
    setBodyText("");
    setFooterText("");
    setButtons([]);
    setSampleValues({});
    setIsCarousel(false);
    setCarouselCards([]);

    const components = Array.isArray(template.components)
      ? template.components
      : [];
    const carouselComp = components.find((c) => c.type === "CAROUSEL");

    if (carouselComp) {
      setIsCarousel(true);
      const bodyComp = components.find((c) => c.type === "BODY");
      if (bodyComp) setBodyText(bodyComp.text || "");

      const loadedCards = (carouselComp.cards || []).map((card) => {
        const header = card.components?.find((cc) => cc.type === "HEADER");
        const body = card.components?.find((cc) => cc.type === "BODY");
        const buttonsComp = card.components?.find((cc) => cc.type === "BUTTONS");
        const sampleUrl = header?.example?.header_handle?.[0]?.startsWith("http")
          ? header.example.header_handle[0]
          : null;
        return {
          headerType: header?.format || "IMAGE",
          mediaFile: null,
          previewUrl: sampleUrl,
          bodyText: body?.text || "",
          buttons: (buttonsComp?.buttons || []).map((b) => ({
            type: b.type,
            text: b.text,
            url: b.url || "",
            phone_number: b.phone_number || "",
          })),
        };
      });
      setCarouselCards(loadedCards);
    } else {
      components.forEach((c) => {
        if (c.type === "HEADER") {
          setHeaderType(c.format);
          if (c.format === "TEXT") {
            setHeaderText(c.text || "");
          } else if (c.example?.header_handle?.[0]?.startsWith("http")) {
            setHeaderPreviewUrl(c.example.header_handle[0]);
          }
        }
        if (c.type === "BODY") {
          setBodyText(c.text || "");
          if (c.example?.body_text?.[0]) {
            const examples = c.example.body_text[0];
            const samples = {};
            examples.forEach((val, idx) => {
              samples[`{{${idx + 1}}}`] = val;
            });
            setSampleValues(samples);
          }
        }
        if (c.type === "FOOTER") {
          setFooterText(c.text || "");
        }
        if (c.type === "BUTTONS") {
          setButtons(
            (c.buttons || []).map((b) => ({
              type: b.type,
              text: b.text,
              url: b.url || "",
              phone_number: b.phone_number || "",
            }))
          );
        }
      });
    }

    setIsEditing(true);
    setView("create");
  };

  const resetForm = () => {
    setName("");
    setCategory("MARKETING");
    setLanguage("en_US");
    setHeaderType("NONE");
    setHeaderText("");
    setHeaderMediaFile(null);
    setHeaderPreviewUrl(null);
    setBodyText("");
    setFooterText("");
    setButtons([]);
    setSampleValues({});
    setIsEditing(false);
    setIsCarousel(false);
    setCarouselCards([]);
  };

  const handleAddButton = () => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type: "QUICK_REPLY", text: "" }]);
  };

  const handleRemoveButton = (idx) => {
    setButtons(buttons.filter((_, i) => i !== idx));
  };

  const handleButtonChange = (idx, field, val) => {
    const newButtons = [...buttons];
    newButtons[idx][field] = val;
    setButtons(newButtons);
  };

  const handleAddCard = () => {
    if (carouselCards.length >= 10) return;
    setCarouselCards([
      ...carouselCards,
      {
        headerType: "IMAGE",
        mediaFile: null,
        previewUrl: null,
        bodyText: "",
        buttons: [],
      },
    ]);
  };

  const handleRemoveCard = (idx) => {
    setCarouselCards(carouselCards.filter((_, i) => i !== idx));
  };

  const handleCardChange = (idx, field, val) => {
    const newCards = [...carouselCards];
    newCards[idx][field] = val;
    setCarouselCards(newCards);
  };

  const handleCardFileChange = (idx, e) => {
    const file = e.target.files[0];
    if (file) {
      const newCards = [...carouselCards];
      newCards[idx].mediaFile = file;
      newCards[idx].previewUrl = URL.createObjectURL(file);
      setCarouselCards(newCards);
    }
  };

  const handleAddCardButton = (cardIdx) => {
    const newCards = [...carouselCards];
    if (newCards[cardIdx].buttons.length >= 2) return;
    newCards[cardIdx].buttons.push({ type: "QUICK_REPLY", text: "" });
    setCarouselCards(newCards);
  };

  const handleRemoveCardButton = (cardIdx, btnIdx) => {
    const newCards = [...carouselCards];
    newCards[cardIdx].buttons = newCards[cardIdx].buttons.filter(
      (_, i) => i !== btnIdx
    );
    setCarouselCards(newCards);
  };

  const handleCardButtonChange = (cardIdx, btnIdx, field, val) => {
    const newCards = [...carouselCards];
    newCards[cardIdx].buttons[btnIdx][field] = val;
    setCarouselCards(newCards);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setHeaderMediaFile(file);
      setHeaderPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadMediaToBackend = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("wabaId", selectedWaba);

    const res = await axios.post(
      `${API_URL}/api/templates/upload-media`,
      formData,
      {
        headers: {
          "x-auth-token": token,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const components = [];

      if (isCarousel) {
        if (!bodyText) {
          alert("Carousel templates require a main message body text.");
          setSubmitting(false);
          return;
        }
        const bodyComponent = { type: "BODY", text: bodyText };
        const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
        if (matches.length > 0) {
          const uniqueVars = [...new Set(matches)].sort();
          const exampleValues = uniqueVars.map(
            (v) => sampleValues[v] || "sample"
          );
          bodyComponent.example = { body_text: [exampleValues] };
        }
        components.push(bodyComponent);

        if (carouselCards.length === 0) {
          alert("Please add at least one card to the carousel.");
          setSubmitting(false);
          return;
        }

        setUploadingMedia(true);
        const processedCards = [];
        for (let i = 0; i < carouselCards.length; i++) {
          const card = carouselCards[i];
          const cardComponents = [];

          let handle = null;
          let publicUrl = null;

          if (card.mediaFile) {
            try {
              const uploadData = await uploadMediaToBackend(card.mediaFile);
              handle = uploadData.handle;
              publicUrl = uploadData.url;
            } catch (err) {
              alert(`Media Upload Failed for Card ${i + 1}. Please try again.`);
              setUploadingMedia(false);
              setSubmitting(false);
              return;
            }
          } else {
            alert(`Please select an image/video for Card ${i + 1}.`);
            setUploadingMedia(false);
            setSubmitting(false);
            return;
          }

          cardComponents.push({
            type: "HEADER",
            format: card.headerType || "IMAGE",
            example: { header_handle: [handle] },
          });

          if (publicUrl) {
            cardComponents[cardComponents.length - 1]._publicUrl = publicUrl;
          }

          if (!card.bodyText) {
            alert(`Card ${i + 1} requires body text.`);
            setUploadingMedia(false);
            setSubmitting(false);
            return;
          }
          cardComponents.push({
            type: "BODY",
            text: card.bodyText,
          });

          if (card.buttons && card.buttons.length > 0) {
            const formattedButtons = card.buttons.map((b) => {
              if (b.type === "URL")
                return { type: "URL", text: b.text, url: b.url };
              if (b.type === "PHONE_NUMBER")
                return {
                  type: "PHONE_NUMBER",
                  text: b.text,
                  phone_number: b.phone_number,
                };
              return { type: "QUICK_REPLY", text: b.text };
            });
            cardComponents.push({ type: "BUTTONS", buttons: formattedButtons });
          }

          processedCards.push({ components: cardComponents });
        }
        setUploadingMedia(false);

        components.push({
          type: "CAROUSEL",
          cards: processedCards,
        });
      } else {
        if (headerType !== "NONE") {
          if (headerType === "TEXT") {
            components.push({
              type: "HEADER",
              format: "TEXT",
              text: headerText,
            });
          } else {
            let handle = null;
            let publicUrl = null;
            if (headerMediaFile) {
              setUploadingMedia(true);
              try {
                const uploadData = await uploadMediaToBackend(headerMediaFile);
                handle = uploadData.handle;
                publicUrl = uploadData.url;
                setUploadingMedia(false);
              } catch (uploadErr) {
                alert("Media Upload Failed. Please try again.");
                setUploadingMedia(false);
                setSubmitting(false);
                return;
              }
            } else {
              alert(
                `Please select a ${headerType.toLowerCase()} file for the header.`
              );
              setSubmitting(false);
              return;
            }

            components.push({
              type: "HEADER",
              format: headerType,
              example: {
                header_handle: [handle],
              },
              _publicUrl: publicUrl,
            });
          }
        }

        const bodyComponent = {
          type: "BODY",
          text: bodyText,
        };

        const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
        if (matches.length > 0) {
          const uniqueVars = [...new Set(matches)].sort();
          const exampleValues = uniqueVars.map(
            (v) => sampleValues[v] || "sample"
          );
          bodyComponent.example = {
            body_text: [exampleValues],
          };
        }
        components.push(bodyComponent);

        if (footerText) {
          components.push({
            type: "FOOTER",
            text: footerText,
          });
        }

        if (buttons.length > 0) {
          const formattedButtons = buttons.map((b) => {
            if (b.type === "URL")
              return { type: "URL", text: b.text, url: b.url };
            if (b.type === "PHONE_NUMBER")
              return {
                type: "PHONE_NUMBER",
                text: b.text,
                phone_number: b.phone_number,
              };
            return { type: "QUICK_REPLY", text: b.text };
          });
          components.push({
            type: "BUTTONS",
            buttons: formattedButtons,
          });
        }
      }

      const payload = {
        wabaId: selectedWaba,
        name: name.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        category,
        language,
        components,
      };

      await axios.post(`${API_URL}/api/templates`, payload, {
        headers: { "x-auth-token": token },
      });

      alert(
        isEditing
          ? "New template version submitted successfully!"
          : "Template submitted successfully!"
      );
      setView("list");
      resetForm();
      fetchTemplates();
    } catch (err) {
      console.error("Create template error:", err);
      const msg =
        err.response?.data?.error?.error?.message ||
        err.response?.data?.error?.message ||
        "Failed to create template";
      alert(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
      setUploadingMedia(false);
    }
  };

  const handleDeleteTemplate = async (templateName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${templateName}"?`))
      return;

    try {
      await axios.delete(
        `${API_URL}/api/templates/${selectedWaba}/${templateName}`,
        {
          headers: { "x-auth-token": token },
        }
      );
      fetchTemplates();
      if (selectedTemplate?.name === templateName) {
        setView("list");
        setSelectedTemplate(null);
      }
    } catch (err) {
      alert("Failed to delete template");
    }
  };

  // Filtered Templates
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
    new Set(["en", "en_US", "ar", ...templates.map((t) => t.language).filter(Boolean)])
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

  // Summary metrics for the whole WABA table
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

  // Metrics for selected template in details view
  const detailSent =
    analyticsSummary?.messages_sent ?? selectedTemplate?.messages_sent ?? 0;
  const detailDelivered =
    analyticsSummary?.messages_delivered ??
    selectedTemplate?.messages_delivered ??
    0;
  const detailRead =
    analyticsSummary?.messages_read ?? selectedTemplate?.messages_read ?? 0;
  const detailReplies =
    analyticsSummary?.unique_replies ?? selectedTemplate?.unique_replies ?? 0;
  const detailFailed =
    analyticsSummary?.messages_failed ?? selectedTemplate?.messages_failed ?? 0;
  const detailSkipped =
    analyticsSummary?.messages_skipped ??
    selectedTemplate?.messages_skipped ??
    0;
  const detailReadRate =
    analyticsSummary?.read_rate ??
    selectedTemplate?.read_rate ??
    (detailDelivered > 0 ? Math.round((detailRead / detailDelivered) * 100) : 0);
  const detailDeliveryRate =
    analyticsSummary?.delivery_rate ??
    selectedTemplate?.delivery_rate ??
    (detailSent > 0 ? Math.round((detailDelivered / detailSent) * 100) : 0);
  const detailReplyRate =
    detailDelivered > 0
      ? Math.min(100, Math.round((detailReplies / detailDelivered) * 100))
      : 0;
  const detailAmountSpent =
    analyticsSummary?.amount_spent ?? selectedTemplate?.amount_spent ?? 0;
  const detailCostPerMsg =
    analyticsSummary?.cost_per_message ??
    selectedTemplate?.cost_per_message ??
    0;
  const detailHeaderImage =
    analyticsSummary?.headerImageUrl ||
    selectedTemplate?.headerImageUrl ||
    null;

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
                  resetForm();
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
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Left side: WABA + Search */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
                {/* WABA Selector */}
                <select
                  className="h-10 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  value={selectedWaba}
                  onChange={(e) => setSelectedWaba(e.target.value)}
                >
                  {wabas.map((w) => (
                    <option key={w.wabaId} value={w.wabaId}>
                      {w.businessName || w.wabaId}
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
                    <th className="py-3.5 px-3">Last Updated</th>
                    <th className="py-3.5 pl-3 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="text-center py-16 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-600" />
                          <span>Loading templates & analytics...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTemplates.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-16 text-slate-400">
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
                      const readRate = t.read_rate || 0;
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
                              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
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
                                ({t.delivery_rate || Math.round((delivCount / sentCount) * 100)}%)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <span
                                className={`font-semibold ${
                                  readRate >= 50
                                    ? "text-emerald-600"
                                    : readRate > 0
                                    ? "text-blue-600"
                                    : "text-slate-500"
                                }`}
                              >
                                {readRate}%
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
                              ? new Date(t.last_updated_time).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )
                              : "--"}
                          </td>
                          <td
                            className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleEditTemplate(t)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit / New Version"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteTemplate(t.name, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Template"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
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
                  {analyticsSummary?.campaigns_count > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 font-semibold">
                        Used in {analyticsSummary.campaigns_count} campaign
                        {analyticsSummary.campaigns_count > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Toolbar: Cloud API badge, Date Range selector, Refresh, Edit, Delete */}
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
                onClick={() => handleEditTemplate(selectedTemplate)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Edit template
              </button>

              <button
                onClick={(e) => handleDeleteTemplate(selectedTemplate.name, e)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 bg-white border border-slate-200 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all"
                title="Delete Template"
              >
                <TrashIcon className="w-4 h-4" />
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
            {detailAmountSpent > 0 && (
              <div className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded-lg border border-blue-100 whitespace-nowrap">
                Meta Spend: ${detailAmountSpent.toFixed(2)} ($
                {detailCostPerMsg.toFixed(3)}/msg)
              </div>
            )}
          </div>

          {/* Main Content: Left Phone Preview + Right Performance Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Template Preview */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
                <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center justify-between">
                  <span>Template Preview</span>
                  <span className="text-xs font-normal text-slate-400">
                    WhatsApp Render
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
                      Contacts who responded
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
                        {detailAmountSpent > 0 ? "Amount Spent" : "Campaigns Run"}
                      </span>
                      <SparklesIcon className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {detailAmountSpent > 0
                        ? `$${detailAmountSpent.toFixed(2)}`
                        : analyticsSummary?.campaigns_count ?? 0}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {detailAmountSpent > 0
                        ? `Avg $${detailCostPerMsg.toFixed(3)} per message`
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
                        <span className="text-sm">Loading performance chart...</span>
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
                            dataKey="date"
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
                            dataKey="replied"
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
          <div className="mb-4">
            <button
              onClick={() => setView("list")}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to templates
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Side */}
            <div className="lg:col-span-7 bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {isEditing
                    ? `Create New Version from "${name}"`
                    : "Create New Template"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configure your message structure, variables, media header, and interactive buttons
                </p>
              </div>

              {isEditing && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl mb-6 text-xs text-amber-800">
                  <strong>Note:</strong> Meta does not allow direct editing of active templates. Submitting this form will create a new template (please adjust the name slightly if creating a variation).
                </div>
              )}

              <form onSubmit={handleCreateTemplate} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Template Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. welcome_offer_2026"
                      className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Lowercase letters, numbers, and underscores only
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Language
                    </label>
                    <select
                      className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="en_US">English (US)</option>
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Template Type
                    </label>
                    <div className="flex items-center gap-4 h-10">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                        <input
                          type="radio"
                          name="templateType"
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          checked={!isCarousel}
                          onChange={() => setIsCarousel(false)}
                        />
                        Standard
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                        <input
                          type="radio"
                          name="templateType"
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          checked={isCarousel}
                          onChange={() => {
                            setIsCarousel(true);
                            setCategory("MARKETING");
                            if (carouselCards.length === 0) handleAddCard();
                          }}
                        />
                        Carousel (Multi-Card)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Standard Header Section */}
                {!isCarousel && (
                  <div className="border-t border-slate-100 pt-5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Header (Optional)
                    </label>
                    <select
                      className="w-full sm:w-64 h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white mb-3"
                      value={headerType}
                      onChange={(e) => {
                        setHeaderType(e.target.value);
                        setHeaderMediaFile(null);
                        setHeaderPreviewUrl(null);
                      }}
                    >
                      <option value="NONE">None</option>
                      <option value="TEXT">Text</option>
                      <option value="IMAGE">Image</option>
                      <option value="VIDEO">Video</option>
                      <option value="DOCUMENT">Document</option>
                    </select>

                    {headerType === "TEXT" && (
                      <input
                        type="text"
                        placeholder="Enter header text..."
                        className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        maxLength={60}
                      />
                    )}

                    {["IMAGE", "VIDEO", "DOCUMENT"].includes(headerType) && (
                      <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept={
                            headerType === "IMAGE"
                              ? "image/*"
                              : headerType === "VIDEO"
                              ? "video/*"
                              : ".pdf"
                          }
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                          Upload a sample {headerType.toLowerCase()} for Meta approval & preview.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Body Text */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Body Text
                    </label>
                    <span className="text-xs text-slate-400">
                      {bodyText.length}/1024
                    </span>
                  </div>
                  <textarea
                    required
                    rows={6}
                    placeholder="Enter the main message body... Use {{1}}, {{2}} for dynamic variables."
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white leading-relaxed"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    maxLength={1024}
                  />
                </div>

                {/* Variable Samples */}
                {bodyText.match(/\{\{\d+\}\}/g) && (
                  <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-3">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Sample Values for Variables (Required by Meta)
                    </h4>
                    {[...new Set(bodyText.match(/\{\{\d+\}\}/g))]
                      .sort()
                      .map((v) => (
                        <div key={v} className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-amber-800 w-12">
                            {v}
                          </span>
                          <input
                            type="text"
                            required
                            placeholder={`Sample value for ${v} (e.g. John)`}
                            className="flex-1 h-9 px-3 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                            value={sampleValues[v] || ""}
                            onChange={(e) =>
                              setSampleValues({
                                ...sampleValues,
                                [v]: e.target.value,
                              })
                            }
                          />
                        </div>
                      ))}
                  </div>
                )}

                {/* Standard Footer & Buttons */}
                {!isCarousel && (
                  <>
                    <div className="border-t border-slate-100 pt-5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Footer (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter footer text..."
                        className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                        maxLength={60}
                      />
                    </div>

                    <div className="border-t border-slate-100 pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Interactive Buttons (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={handleAddButton}
                          disabled={buttons.length >= 3}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 transition-colors"
                        >
                          <PlusIcon className="w-3.5 h-3.5" /> Add Button
                        </button>
                      </div>

                      <div className="space-y-3">
                        {buttons.map((btn, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <select
                                className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg"
                                value={btn.type}
                                onChange={(e) =>
                                  handleButtonChange(idx, "type", e.target.value)
                                }
                              >
                                <option value="QUICK_REPLY">Quick Reply</option>
                                <option value="URL">Visit Website (URL)</option>
                                <option value="PHONE_NUMBER">
                                  Call Phone Number
                                </option>
                              </select>
                              <input
                                type="text"
                                placeholder="Button label text"
                                required
                                className="flex-1 h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg"
                                value={btn.text}
                                onChange={(e) =>
                                  handleButtonChange(idx, "text", e.target.value)
                                }
                                maxLength={25}
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveButton(idx)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                            {btn.type === "URL" && (
                              <input
                                type="url"
                                placeholder="https://example.com"
                                required
                                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg"
                                value={btn.url || ""}
                                onChange={(e) =>
                                  handleButtonChange(idx, "url", e.target.value)
                                }
                              />
                            )}
                            {btn.type === "PHONE_NUMBER" && (
                              <input
                                type="tel"
                                placeholder="+971501234567"
                                required
                                className="w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded-lg"
                                value={btn.phone_number || ""}
                                onChange={(e) =>
                                  handleButtonChange(
                                    idx,
                                    "phone_number",
                                    e.target.value
                                  )
                                }
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Carousel Cards Configuration */}
                {isCarousel && (
                  <div className="border-t border-slate-100 pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Carousel Cards ({carouselCards.length}/10)
                      </label>
                      <button
                        type="button"
                        onClick={handleAddCard}
                        disabled={carouselCards.length >= 10}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-40"
                      >
                        <PlusIcon className="w-3.5 h-3.5" /> Add Card
                      </button>
                    </div>

                    <div className="space-y-4">
                      {carouselCards.map((card, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <h4 className="font-bold text-slate-700 text-sm">
                              Card #{cIdx + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleRemoveCard(cIdx)}
                              className="text-rose-500 hover:bg-rose-50 p-1 rounded"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <select
                              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg"
                              value={card.headerType}
                              onChange={(e) =>
                                handleCardChange(
                                  cIdx,
                                  "headerType",
                                  e.target.value
                                )
                              }
                            >
                              <option value="IMAGE">Image</option>
                              <option value="VIDEO">Video</option>
                            </select>
                            <input
                              type="file"
                              onChange={(e) => handleCardFileChange(cIdx, e)}
                              accept={
                                card.headerType === "IMAGE"
                                  ? "image/*"
                                  : "video/*"
                              }
                              className="sm:col-span-2 text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700"
                            />
                          </div>

                          <textarea
                            rows={2}
                            required
                            placeholder="Card description text..."
                            className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg"
                            value={card.bodyText}
                            onChange={(e) =>
                              handleCardChange(cIdx, "bodyText", e.target.value)
                            }
                            maxLength={160}
                          />

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-500">
                                Card Buttons ({card.buttons.length}/2)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddCardButton(cIdx)}
                                disabled={card.buttons.length >= 2}
                                className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-40"
                              >
                                + Add Button
                              </button>
                            </div>
                            {card.buttons.map((btn, bIdx) => (
                              <div
                                key={bIdx}
                                className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <select
                                    className="h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded"
                                    value={btn.type}
                                    onChange={(e) =>
                                      handleCardButtonChange(
                                        cIdx,
                                        bIdx,
                                        "type",
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="QUICK_REPLY">Reply</option>
                                    <option value="URL">URL</option>
                                    <option value="PHONE_NUMBER">Phone</option>
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Label"
                                    required
                                    className="flex-1 h-8 px-2.5 text-xs border border-slate-200 rounded"
                                    value={btn.text}
                                    onChange={(e) =>
                                      handleCardButtonChange(
                                        cIdx,
                                        bIdx,
                                        "text",
                                        e.target.value
                                      )
                                    }
                                    maxLength={25}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveCardButton(cIdx, bIdx)
                                    }
                                    className="text-rose-500 p-1"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {btn.type === "URL" && (
                                  <input
                                    type="url"
                                    placeholder="https://example.com"
                                    required
                                    className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded"
                                    value={btn.url || ""}
                                    onChange={(e) =>
                                      handleCardButtonChange(
                                        cIdx,
                                        bIdx,
                                        "url",
                                        e.target.value
                                      )
                                    }
                                  />
                                )}
                                {btn.type === "PHONE_NUMBER" && (
                                  <input
                                    type="tel"
                                    placeholder="+971501234567"
                                    required
                                    className="w-full h-8 px-2.5 text-xs border border-slate-200 rounded"
                                    value={btn.phone_number || ""}
                                    onChange={(e) =>
                                      handleCardButtonChange(
                                        cIdx,
                                        bIdx,
                                        "phone_number",
                                        e.target.value
                                      )
                                    }
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={submitting || uploadingMedia}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
                  >
                    {uploadingMedia
                      ? "Uploading Media to Meta..."
                      : submitting
                      ? "Submitting Template..."
                      : "Submit Template for Approval"}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Preview Side */}
            <div className="lg:col-span-5 sticky top-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
                  Live WhatsApp Preview
                </h3>
                <TemplatePreview
                  headerType={headerType}
                  headerText={headerText}
                  headerMediaUrl={headerPreviewUrl}
                  bodyText={bodyText}
                  footerText={footerText}
                  buttons={buttons}
                  isCarousel={isCarousel}
                  carouselCards={carouselCards}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
