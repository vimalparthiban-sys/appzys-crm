import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Globe, 
  ExternalLink, 
  Mail, 
  Phone, 
  User, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Send, 
  Video, 
  PhoneCall, 
  Share2, 
  CalendarClock, 
  ChevronLeft,
  X,
  Edit2,
  AlertCircle,
  History,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Laptop,
  Tablet,
  Smartphone,
  Users
} from 'lucide-react';
import { CRM_API } from '../services/api';
import StatusBadge, { PIPELINE_STAGES } from '../components/StatusBadge';
import FollowUpBadge from '../components/FollowUpBadge';

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAllActivities, setShowAllActivities] = useState(false);

  // Modals state
  const [showAddSource, setShowAddSource] = useState(false);
  const [showScheduleFollowUp, setShowScheduleFollowUp] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  // Quick Outreach Modals
  const [showQuickContactModal, setShowQuickContactModal] = useState(false);
  const [quickContactForm, setQuickContactForm] = useState({
    activityType: 'CALL',
    platform: 'Phone',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  });
  const [quickContactSaving, setQuickContactSaving] = useState(false);
  const [quickContactError, setQuickContactError] = useState(null);

  const [showQuickResponseModal, setShowQuickResponseModal] = useState(false);
  const [quickResponseForm, setQuickResponseForm] = useState({
    responseType: 'Email',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  });
  const [quickResponseSaving, setQuickResponseSaving] = useState(false);
  const [quickResponseError, setQuickResponseError] = useState(null);

  // Person-Level CRM Contacts state
  const [contacts, setContacts] = useState([]);
  const [expandedContactHistories, setExpandedContactHistories] = useState({});
  const [contactActivities, setContactActivities] = useState({});
  const [loadingHistories, setLoadingHistories] = useState({});
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addContactForm, setAddContactForm] = useState({
    personName: '',
    designation: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    initialStatus: 'FOUND'
  });
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editContactForm, setEditContactForm] = useState({
    personName: '',
    designation: '',
    email: '',
    phone: '',
    linkedinUrl: ''
  });
  const [showPersonActivityModal, setShowPersonActivityModal] = useState(false);
  const [activeContactForActivity, setActiveContactForActivity] = useState(null);
  const [personActivityForm, setPersonActivityForm] = useState({
    activityType: 'CALL',
    platform: 'Phone',
    activityDate: new Date().toISOString().slice(0, 10),
    description: ''
  });

  // Existing Form states
  const [sourceForm, setSourceForm] = useState({ platformName: 'LinkedIn', sourceUrl: '', notes: '' });
  const [followUpForm, setFollowUpForm] = useState({ scheduledDate: '', reason: '' });
  const [activityForm, setActivityForm] = useState({
    activityType: 'CALL',
    platform: 'Phone',
    title: '',
    description: '',
    outcome: '',
    eventTimestamp: new Date().toISOString().slice(0, 16),
  });
  const [activityEditDesc, setActivityEditDesc] = useState('');
  const [editForm, setEditForm] = useState({ name: '', officialWebsite: '', contactPerson: '', email: '', phone: '' });

  const fetchCompanyDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CRM_API.getCompanyById(id);
      setCompany(data);
      setContacts(data.contacts || []);
      setEditForm({
        name: data.name,
        officialWebsite: data.officialWebsite,
        contactPerson: data.contactPerson || '',
        email: data.email || '',
        phone: data.phone || '',
      });
    } catch (err) {
      setError(err.message || 'Failed to load company details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await CRM_API.updateStatus(id, newStatus);
      setCompany(updated);
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Quick Contact Activity Save
  const handleSaveQuickContact = async (e) => {
    e.preventDefault();
    setQuickContactSaving(true);
    setQuickContactError(null);
    try {
      const typeLabel = quickContactForm.activityType === 'CALL' 
        ? 'Call' 
        : quickContactForm.activityType === 'EMAIL' 
          ? 'Email' 
          : 'Message';
      const title = `${typeLabel} (${quickContactForm.platform || 'Phone'})`;

      const now = new Date();
      let eventDate = now;
      if (quickContactForm.date) {
        const [y, m, d] = quickContactForm.date.split('-').map(Number);
        eventDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      }

      // 1. Save activity to database
      await CRM_API.addActivity(id, {
        activityType: quickContactForm.activityType,
        platform: quickContactForm.platform || 'Phone',
        title,
        description: quickContactForm.description.trim() || null,
        eventTimestamp: eventDate.toISOString(),
      });

      // 2. Advance stage to CONTACTED if not already Contacted
      if (company.status !== 'CONTACTED') {
        await CRM_API.updateStatus(id, 'CONTACTED');
      }

      // 3. Refresh and close
      await fetchCompanyDetails();
      setShowQuickContactModal(false);
      setQuickContactForm((prev) => ({
        ...prev,
        description: '',
        date: new Date().toISOString().slice(0, 10),
      }));
    } catch (err) {
      console.error('Failed to log contact activity:', err);
      setQuickContactError(err.message || 'Failed to save contact activity.');
    } finally {
      setQuickContactSaving(false);
    }
  };

  // Quick Response Save
  const handleSaveQuickResponse = async (e) => {
    e.preventDefault();
    setQuickResponseSaving(true);
    setQuickResponseError(null);
    try {
      const respType = quickResponseForm.responseType || 'Email';
      const title = `Reply received via ${respType}`;

      const now = new Date();
      let eventDate = now;
      if (quickResponseForm.date) {
        const [y, m, d] = quickResponseForm.date.split('-').map(Number);
        eventDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
      }

      // 1. Save activity to database
      await CRM_API.addActivity(id, {
        activityType: 'REPLY',
        platform: respType,
        title,
        description: quickResponseForm.description.trim() || null,
        eventTimestamp: eventDate.toISOString(),
      });

      // 2. Advance stage to REPLY_RECEIVED if not already in that status
      if (company.status !== 'REPLY_RECEIVED') {
        await CRM_API.updateStatus(id, 'REPLY_RECEIVED');
      }

      // 3. Refresh and close
      await fetchCompanyDetails();
      setShowQuickResponseModal(false);
      setQuickResponseForm((prev) => ({
        ...prev,
        description: '',
        date: new Date().toISOString().slice(0, 10),
      }));
    } catch (err) {
      console.error('Failed to save received response:', err);
      setQuickResponseError(err.message || 'Failed to save received response.');
    } finally {
      setQuickResponseSaving(false);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    try {
      const updated = await CRM_API.attachSource(id, sourceForm);
      setCompany(updated);
      setShowAddSource(false);
      setSourceForm({ platformName: 'LinkedIn', sourceUrl: '', notes: '' });
    } catch (err) {
      alert(err.message || 'Failed to add discovery source.');
    }
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    try {
      const updated = await CRM_API.scheduleFollowUp(id, followUpForm);
      setCompany(updated);
      setShowScheduleFollowUp(false);
      setFollowUpForm({ scheduledDate: '', reason: '' });
    } catch (err) {
      alert(err.message || 'Failed to schedule follow-up.');
    }
  };

  const handleCompleteFollowUp = async (fId) => {
    try {
      const updated = await CRM_API.completeFollowUp(id, fId);
      setCompany(updated);
    } catch (err) {
      alert(err.message || 'Failed to complete follow-up.');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await CRM_API.addActivity(id, activityForm);
      fetchCompanyDetails();
      setShowAddActivity(false);
      setActivityForm({
        activityType: 'CALL',
        platform: 'Phone',
        title: '',
        description: '',
        outcome: '',
        eventTimestamp: new Date().toISOString().slice(0, 16),
      });
    } catch (err) {
      alert(err.message || 'Failed to log activity.');
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    try {
      const updated = await CRM_API.updateLead(id, editForm);
      setCompany(updated);
      setShowEditCompany(false);
    } catch (err) {
      alert(err.message || 'Failed to update company.');
    }
  };

  const handleEditActivitySubmit = async (e) => {
    e.preventDefault();
    if (!editingActivity) return;
    try {
      await CRM_API.updateActivityDescription(id, editingActivity.id, activityEditDesc);
      fetchCompanyDetails();
      setEditingActivity(null);
      setActivityEditDesc('');
    } catch (err) {
      alert(err.message || 'Failed to update activity description.');
    }
  };

  // Contact Handlers
  const handleToggleContactHistory = async (contactId) => {
    const isCurrentlyExpanded = !!expandedContactHistories[contactId];
    setExpandedContactHistories(prev => ({ ...prev, [contactId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !contactActivities[contactId]) {
      setLoadingHistories(prev => ({ ...prev, [contactId]: true }));
      try {
        const acts = await CRM_API.getPersonActivities(id, contactId);
        setContactActivities(prev => ({ ...prev, [contactId]: acts }));
      } catch (err) {
        console.error('Failed to load contact activities:', err);
      } finally {
        setLoadingHistories(prev => ({ ...prev, [contactId]: false }));
      }
    }
  };

  const handleUpdateContactStatus = async (contactId, newStatus) => {
    try {
      const updatedContact = await CRM_API.updateContactStatus(id, contactId, newStatus);
      setContacts(prev => prev.map(c => c.id === contactId ? updatedContact : c));

      // Refresh contact's isolated activities if open or cached
      try {
        const acts = await CRM_API.getPersonActivities(id, contactId);
        setContactActivities(prev => ({ ...prev, [contactId]: acts }));
      } catch (ignored) {}
    } catch (err) {
      alert(err.message || 'Failed to update contact status.');
    }
  };

  const handleOpenAddContactModal = () => {
    setAddContactForm({
      personName: '',
      designation: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      initialStatus: 'FOUND'
    });
    setShowAddContactModal(true);
  };

  const handleSaveAddContact = async (e) => {
    e.preventDefault();
    try {
      const created = await CRM_API.addCompanyContact(id, addContactForm);
      setContacts(prev => [...prev, created]);
      setShowAddContactModal(false);
    } catch (err) {
      alert(err.message || 'Failed to add contact.');
    }
  };

  const handleOpenEditContactModal = (contact) => {
    setEditingContact(contact);
    setEditContactForm({
      personName: contact.personName || '',
      designation: contact.designation || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedinUrl: contact.linkedinUrl || ''
    });
    setShowEditContactModal(true);
  };

  const handleSaveEditContact = async (e) => {
    e.preventDefault();
    if (!editingContact) return;
    try {
      const updated = await CRM_API.updateCompanyContact(id, editingContact.id, editContactForm);
      setContacts(prev => prev.map(c => c.id === editingContact.id ? updated : c));
      setShowEditContactModal(false);
      setEditingContact(null);
    } catch (err) {
      alert(err.message || 'Failed to update contact details.');
    }
  };

  const handleOpenPersonActivityModal = (contact) => {
    setActiveContactForActivity(contact);
    setPersonActivityForm({
      activityType: 'CALL',
      platform: 'Phone',
      activityDate: new Date().toISOString().slice(0, 10),
      description: ''
    });
    setShowPersonActivityModal(true);
  };

  const handleSavePersonActivity = async (e) => {
    e.preventDefault();
    if (!activeContactForActivity) return;
    try {
      await CRM_API.addPersonActivity(id, activeContactForActivity.id, personActivityForm);
      
      // Update activity count on contact
      setContacts(prev => prev.map(c => {
        if (c.id === activeContactForActivity.id) {
          return { ...c, activitiesCount: (c.activitiesCount || 0) + 1 };
        }
        return c;
      }));

      // Refresh that contact's activity timeline
      const acts = await CRM_API.getPersonActivities(id, activeContactForActivity.id);
      setContactActivities(prev => ({ ...prev, [activeContactForActivity.id]: acts }));
      setExpandedContactHistories(prev => ({ ...prev, [activeContactForActivity.id]: true }));

      setShowPersonActivityModal(false);
      setActiveContactForActivity(null);
    } catch (err) {
      alert(err.message || 'Failed to log person activity.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-crm-muted animate-pulse">
        Loading company details...
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-50 rounded-2xl border border-red-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
        <h3 className="text-sm font-bold text-red-900">Failed to Load Company</h3>
        <p className="text-xs text-red-700">{error || 'Company not found.'}</p>
        <button
          onClick={fetchCompanyDetails}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const allActivities = company.activities || [];
  const displayedActivities = showAllActivities ? allActivities : allActivities.slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn pb-12">
      {/* Back button */}
      <button
        onClick={() => navigate('/companies')}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-crm-primary transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Companies</span>
      </button>

      {/* SECTION 10: COMPANY HEADER */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-purple-50 text-crm-primary flex items-center justify-center shrink-0 shadow-inner">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-crm-dark truncate">{company.name}</h2>
              <StatusBadge status={company.status} />
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-crm-muted pt-1">
              <a
                href={company.officialWebsite}
                target="_blank"
                rel="noreferrer"
                className="text-crm-primary hover:underline flex items-center gap-1 truncate max-w-xs"
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{company.officialWebsite}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>

              {company.contactPerson && (
                <span className="flex items-center gap-1 text-gray-600 truncate">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{company.contactPerson}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowEditCompany(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Company</span>
          </button>

          <button
            onClick={() => setShowAddSource(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 text-crm-primary text-xs font-semibold hover:bg-purple-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Pipeline & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Pipeline Stages + Secondary Statuses */}
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-soft space-y-4">
            <div>
              <h3 className="text-sm font-bold text-crm-dark">Pipeline Stage</h3>
              <p className="text-xs text-crm-muted mt-0.5">Click to transition company across acquisition stages</p>
            </div>

            {/* Primary Acquisition Pipeline: Responsive grid 2 cols on mobile, 3 on sm, 6 on md */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {PIPELINE_STAGES.filter(s => s.key !== 'NO_REPLY' && s.key !== 'REJECTED').map((stage) => {
                const isActive = company.status === stage.key;
                return (
                  <button
                    key={stage.key}
                    onClick={() => {
                      if (stage.key === 'CONTACTED') {
                        setQuickContactError(null);
                        setShowQuickContactModal(true);
                      } else if (stage.key === 'REPLY_RECEIVED') {
                        setQuickResponseError(null);
                        setShowQuickResponseModal(true);
                      } else {
                        handleStatusChange(stage.key);
                      }
                    }}
                    className={`py-2 px-2 sm:px-3 rounded-xl text-xs font-semibold text-center transition-all ${
                      isActive
                        ? 'bg-crm-primary text-white shadow-md shadow-purple-950/20 scale-[1.02]'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                    }`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>

            {/* Additional Statuses: No Reply & Rejected */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-medium text-gray-400">Additional Statuses:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange('NO_REPLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    company.status === 'NO_REPLY'
                      ? 'bg-gray-700 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Mark No Reply
                </button>
                <button
                  onClick={() => handleStatusChange('REJECTED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    company.status === 'REJECTED'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Mark Rejected
                </button>
              </div>
            </div>
          </div>

          {/* SECTION: CONTACTS / PEOPLE (PERSON-LEVEL CRM) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-crm-primary flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-crm-dark">Contacts & Key People</h3>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-crm-primary text-xs font-bold">
                      {contacts.length}
                    </span>
                  </div>
                  <p className="text-xs text-crm-muted">
                    Track individual pipeline statuses and isolated contact timelines per stakeholder
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenAddContactModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crm-primary hover:bg-crm-primary-hover text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Contact</span>
              </button>
            </div>

            {/* List of Contacts */}
            {contacts.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-2xl bg-gray-50/70 border border-dashed border-gray-200 space-y-3">
                <Users className="w-8 h-8 text-gray-300 mx-auto" />
                <div className="max-w-sm mx-auto">
                  <h4 className="text-xs font-bold text-crm-dark">No Individual Contacts Added</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Add multiple contacts under this company to manage their individual pipeline statuses and outreach histories independently.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddContactModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-crm-primary text-white text-xs font-semibold shadow-sm hover:bg-crm-primary-hover transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Contact</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => {
                  const isHistoryExpanded = !!expandedContactHistories[contact.id];
                  const historyList = contactActivities[contact.id] || [];
                  const isHistoryLoading = !!loadingHistories[contact.id];

                  return (
                    <div
                      key={contact.id}
                      className="rounded-2xl border border-gray-100 bg-[#FAFAFC] p-4 space-y-3 hover:border-purple-200 transition-all"
                    >
                      {/* Contact Header: Avatar, Name, Designation, Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-crm-primary font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-white shadow-2xs">
                            {contact.personName ? contact.personName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-crm-dark">{contact.personName}</h4>
                              {contact.designation && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-crm-primary text-[11px] font-semibold border border-purple-200/50">
                                  {contact.designation}
                                </span>
                              )}
                            </div>

                            {/* Contact Methods: Email, Phone, LinkedIn */}
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                              {contact.email ? (
                                <a
                                  href={`mailto:${contact.email}`}
                                  className="flex items-center gap-1 hover:text-crm-primary transition-colors text-crm-dark font-medium"
                                >
                                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{contact.email}</span>
                                </a>
                              ) : (
                                <span className="text-gray-400 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> No email</span>
                              )}

                              {contact.phone && (
                                <a
                                  href={`tel:${contact.phone}`}
                                  className="flex items-center gap-1 hover:text-crm-primary transition-colors text-crm-dark font-medium"
                                >
                                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                                  <span>{contact.phone}</span>
                                </a>
                              )}

                              {contact.linkedinUrl && (
                                <a
                                  href={contact.linkedinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>LinkedIn Profile</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleOpenPersonActivityModal(contact)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-crm-primary text-xs font-semibold transition-colors"
                            title="Log outreach activity with this person"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Log Activity</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditContactModal(contact)}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-crm-dark hover:bg-gray-100 transition-colors"
                            title="Edit Contact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleContactHistory(contact.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              isHistoryExpanded
                                ? 'bg-crm-primary text-white border-crm-primary shadow-xs'
                                : 'bg-white text-crm-dark border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>History ({contact.activitiesCount || 0})</span>
                            {isHistoryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Individual Pipeline Status Selector */}
                      <div className="pt-2.5 border-t border-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Individual Status:</span>
                          <StatusBadge status={contact.status} />
                        </div>

                        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                          {PIPELINE_STAGES.map((st) => {
                            const isCur = contact.status === st.key;
                            return (
                              <button
                                key={st.key}
                                onClick={() => handleUpdateContactStatus(contact.id, st.key)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all shrink-0 ${
                                  isCur
                                    ? 'bg-crm-primary text-white shadow-xs'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                              >
                                {st.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Collapsible Contact Timeline (Strictly Isolated History) */}
                      {isHistoryExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-200/80 bg-white p-3.5 rounded-xl space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-crm-dark flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-crm-primary" />
                              <span>Isolated Timeline for {contact.personName}</span>
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {historyList.length} total recorded {historyList.length === 1 ? 'event' : 'events'}
                            </span>
                          </div>

                          {isHistoryLoading ? (
                            <div className="py-4 text-center text-xs text-gray-400">Loading history...</div>
                          ) : historyList.length === 0 ? (
                            <div className="py-4 text-center text-xs text-gray-400">No activities recorded for this contact yet.</div>
                          ) : (
                            <div className="space-y-3">
                              {historyList.map((item, hIdx) => (
                                <div key={item.id || hIdx} className="flex items-start gap-3 text-xs">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                    item.isAutomatic ? 'bg-purple-50 text-crm-primary' : 'bg-green-50 text-green-700'
                                  }`}>
                                    {item.activityType === 'EMAIL' && <Mail className="w-3.5 h-3.5" />}
                                    {item.activityType === 'CALL' && <PhoneCall className="w-3.5 h-3.5" />}
                                    {item.activityType === 'MEETING' && <Video className="w-3.5 h-3.5" />}
                                    {item.activityType === 'MESSAGE' && <MessageSquare className="w-3.5 h-3.5" />}
                                    {item.activityType === 'STATUS_CHANGED' && <Share2 className="w-3.5 h-3.5" />}
                                    {!['EMAIL', 'CALL', 'MEETING', 'MESSAGE', 'STATUS_CHANGED'].includes(item.activityType) && <Clock className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="flex-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-crm-dark text-xs">{item.title}</span>
                                      <span className="text-[10px] text-gray-400">
                                        {item.eventTimestamp ? new Date(item.eventTimestamp).toLocaleString() : ''}
                                      </span>
                                    </div>
                                    {item.description && (
                                      <p className="text-gray-600 text-xs mt-1 leading-relaxed">{item.description}</p>
                                    )}
                                    {item.platform && !item.isAutomatic && (
                                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-gray-200/60 text-gray-600 font-medium">
                                        {item.platform}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 11: ACTIVITY TIMELINE */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-crm-dark">Contact History & Activity Timeline</h3>
                <p className="text-xs text-crm-muted">
                  Showing {displayedActivities.length} of {allActivities.length} activities (newest first)
                </p>
              </div>

              <button
                onClick={() => setShowAddActivity(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crm-primary hover:bg-crm-primary-hover text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Activity</span>
              </button>
            </div>

            {/* Timeline Entries */}
            <div className="space-y-4 pt-2">
              {displayedActivities.map((act, index) => (
                <div key={act.id || index} className="flex items-start gap-4 relative">
                  {index < (displayedActivities.length - 1) && (
                    <div className="w-0.5 h-full bg-gray-100 absolute left-4 top-8 -z-0"></div>
                  )}

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    act.isAutomatic ? 'bg-purple-50 text-crm-primary' : 'bg-green-50 text-green-700'
                  }`}>
                    {act.activityType === 'EMAIL' && <Mail className="w-4 h-4" />}
                    {act.activityType === 'CALL' && <PhoneCall className="w-4 h-4" />}
                    {act.activityType === 'MEETING' && <Video className="w-4 h-4" />}
                    {act.activityType === 'MESSAGE' && <MessageSquare className="w-4 h-4" />}
                    {act.activityType === 'REPLY' && <CornerDownLeft className="w-4 h-4 text-teal-600" />}
                    {act.activityType === 'STATUS_CHANGED' && <Share2 className="w-4 h-4" />}
                    {act.activityType === 'LEAD_CREATED' && <Plus className="w-4 h-4" />}
                    {act.activityType === 'FOLLOWUP_SCHEDULED' && <CalendarClock className="w-4 h-4" />}
                    {act.activityType === 'FOLLOWUP_RESCHEDULED' && <History className="w-4 h-4" />}
                    {act.activityType === 'FOLLOWUP_COMPLETED' && <CheckCircle2 className="w-4 h-4" />}
                    {!['EMAIL', 'CALL', 'MEETING', 'MESSAGE', 'REPLY', 'STATUS_CHANGED', 'LEAD_CREATED', 'FOLLOWUP_SCHEDULED', 'FOLLOWUP_RESCHEDULED', 'FOLLOWUP_COMPLETED'].includes(act.activityType) && <Clock className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-crm-dark">{act.title}</h4>
                        {act.isAutomatic && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-crm-primary font-medium">
                            System
                          </span>
                        )}
                        {act.platform && !act.isAutomatic && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-200/60 text-gray-600 font-medium">
                            {act.platform}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">
                          {act.eventTimestamp ? new Date(act.eventTimestamp).toLocaleString() : ''}
                        </span>
                        <button
                          onClick={() => {
                            setEditingActivity(act);
                            setActivityEditDesc(act.description || '');
                          }}
                          title="Edit description only (Type & timestamp immutable)"
                          className="text-gray-400 hover:text-crm-primary transition-colors p-1"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {act.description && (
                      <p className="text-xs text-crm-muted mt-1 leading-relaxed whitespace-pre-wrap">{act.description}</p>
                    )}

                    {act.outcome && (
                      <div className="mt-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                        Outcome: {act.outcome}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {allActivities.length === 0 && (
                <div className="text-center py-8 text-crm-muted text-xs">
                  No activity recorded yet.
                </div>
              )}
            </div>

            {/* View Recent / View All Activities Button */}
            {allActivities.length > 5 && (
              <div className="pt-2 text-center border-t border-gray-100">
                <button
                  onClick={() => setShowAllActivities(!showAllActivities)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-crm-primary bg-purple-50 hover:bg-purple-100 transition-colors"
                >
                  {showAllActivities ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Show Recent 5 Only</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>View All Activities ({allActivities.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Follow-up, Info & Sources */}
        <div className="space-y-6">
          {/* Follow-up Card with Correct Lifecycle Differentiation */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-crm-dark">Active Follow-up</h3>
              <FollowUpBadge urgency={company.followUpUrgency} date={company.nextFollowUpDate} />
            </div>

            {company.nextFollowUpDate ? (
              <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-crm-dark">
                  <Calendar className="w-4 h-4 text-crm-primary" />
                  <span>Scheduled: {company.nextFollowUpDate}</span>
                </div>
                {company.nextFollowUpReason && (
                  <p className="text-xs text-gray-600 pl-6">{company.nextFollowUpReason}</p>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleCompleteFollowUp(company.activeFollowUpId)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </button>

                  <button
                    onClick={() => {
                      setFollowUpForm({ scheduledDate: '', reason: '' });
                      setShowScheduleFollowUp(true);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-crm-muted mb-2">No active follow-up scheduled.</p>
                <button
                  onClick={() => {
                    setFollowUpForm({ scheduledDate: '', reason: '' });
                    setShowScheduleFollowUp(true);
                  }}
                  className="px-3 py-1.5 bg-crm-primary text-white rounded-lg text-xs font-semibold hover:bg-crm-primary-hover transition-colors"
                >
                  Schedule Follow-up
                </button>
              </div>
            )}

            {/* Follow-up History (Preserving all previous dates & statuses) */}
            {(company.followUps || []).length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-gray-400" />
                  <span>Follow-up History ({company.followUps.length})</span>
                </span>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {company.followUps.map((f) => {
                    let statusBadgeClass = 'bg-blue-100 text-blue-800'; // SCHEDULED
                    if (f.status === 'COMPLETED') statusBadgeClass = 'bg-green-100 text-green-800 font-semibold';
                    else if (f.status === 'RESCHEDULED') statusBadgeClass = 'bg-purple-100 text-purple-800';
                    else if (f.status === 'CANCELLED') statusBadgeClass = 'bg-gray-200 text-gray-700';

                    return (
                      <div key={f.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{f.scheduledDate}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusBadgeClass}`}>
                              {f.statusDisplayName || f.status}
                            </span>
                          </div>
                          {f.reason && <p className="text-[11px] text-gray-500 mt-0.5">{f.reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Company Contact Information */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-3">
            <h3 className="font-bold text-crm-dark pb-2 border-b border-gray-100">Company Information</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Contact Person</span>
                <span className="font-semibold text-crm-dark">{company.contactPerson || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email</span>
                <span className="font-semibold text-crm-dark">{company.email || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone</span>
                <span className="font-semibold text-crm-dark">{company.phone || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date Added</span>
                <span className="text-gray-600">
                  {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Sources & Discovery Links */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-crm-dark">Sources & Links</h3>
              <button
                onClick={() => setShowAddSource(true)}
                className="text-xs font-semibold text-crm-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {(company.sources || []).map((src) => (
                <div key={src.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-crm-dark">
                    <span>{src.platformName}</span>
                    <span className="text-[10px] text-gray-400 font-normal">
                      {src.createdAt ? new Date(src.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                  {src.sourceUrl && (
                    <a
                      href={src.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-crm-primary hover:underline flex items-center gap-1 truncate block"
                    >
                      <span>{src.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  {src.notes && <p className="text-[11px] text-gray-500 italic">{src.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QUICK POPUP 1: LOG CONTACT ACTIVITY (When Contacted status is clicked) */}
      {showQuickContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-base text-crm-dark">Log Contact Activity</h4>
                <p className="text-[11px] text-crm-muted mt-0.5">Quickly record outreach details for this company</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickContactModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickContactError && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{quickContactError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickContact} className="space-y-4">
              {/* Activity Type selectable chips */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5">
                  Activity Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'CALL', label: 'Call', icon: Phone },
                    { key: 'EMAIL', label: 'Email', icon: Mail },
                    { key: 'MESSAGE', label: 'Message', icon: MessageSquare },
                  ].map((item) => {
                    const isSelected = quickContactForm.activityType === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setQuickContactForm({ ...quickContactForm, activityType: item.key })}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-crm-primary text-white border-crm-primary shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200/80 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Platform / Device selectable chips */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5">
                  Platform / Device
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'Phone', label: 'Phone', icon: Smartphone },
                    { key: 'Laptop', label: 'Laptop', icon: Laptop },
                    { key: 'Tablet', label: 'Tablet', icon: Tablet },
                  ].map((dev) => {
                    const isSelected = quickContactForm.platform === dev.key;
                    return (
                      <button
                        key={dev.key}
                        type="button"
                        onClick={() => setQuickContactForm({ ...quickContactForm, platform: dev.key })}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-purple-50 text-crm-primary border-purple-300 font-bold shadow-2xs'
                            : 'bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-100'
                        }`}
                      >
                        <dev.icon className="w-3.5 h-3.5" />
                        <span>{dev.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Picker Only (Default to today, editable, no time picker) */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-crm-primary" />
                  <span>Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={quickContactForm.date}
                  onChange={(e) => setQuickContactForm({ ...quickContactForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-crm-dark focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                />
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows="3"
                  value={quickContactForm.description}
                  onChange={(e) => setQuickContactForm({ ...quickContactForm, description: e.target.value })}
                  placeholder="Briefly describe what happened..."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-crm-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary resize-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={quickContactSaving}
                  onClick={() => setShowQuickContactModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickContactSaving}
                  className="px-5 py-2 rounded-xl bg-crm-primary hover:bg-crm-primary-hover text-white text-xs font-bold shadow-md shadow-purple-950/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {quickContactSaving ? 'Saving Activity...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK POPUP 2: LOG RECEIVED RESPONSE (When Reply Received status is clicked) */}
      {showQuickResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-base text-crm-dark">Log Received Response</h4>
                <p className="text-[11px] text-crm-muted mt-0.5">Record what the client replied and advance stage</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickResponseModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {quickResponseError && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{quickResponseError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickResponse} className="space-y-4">
              {/* Response Type selectable chips */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5">
                  Response Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'Email', label: 'Email', icon: Mail },
                    { key: 'Call', label: 'Call', icon: Phone },
                    { key: 'Message', label: 'Message', icon: MessageSquare },
                  ].map((item) => {
                    const isSelected = quickResponseForm.responseType === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setQuickResponseForm({ ...quickResponseForm, responseType: item.key })}
                        className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-crm-primary text-white border-crm-primary shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200/80 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Received Picker Only (Default to today, editable, no time picker) */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-crm-primary" />
                  <span>Date Received</span>
                </label>
                <input
                  type="date"
                  required
                  value={quickResponseForm.date}
                  onChange={(e) => setQuickResponseForm({ ...quickResponseForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-crm-dark focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary transition-all"
                />
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows="3"
                  value={quickResponseForm.description}
                  onChange={(e) => setQuickResponseForm({ ...quickResponseForm, description: e.target.value })}
                  placeholder="What did the client reply?"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs text-crm-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-crm-primary/20 focus:border-crm-primary resize-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={quickResponseSaving}
                  onClick={() => setShowQuickResponseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickResponseSaving}
                  className="px-5 py-2 rounded-xl bg-crm-primary hover:bg-crm-primary-hover text-white text-xs font-bold shadow-md shadow-purple-950/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {quickResponseSaving ? 'Saving Response...' : 'Save Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD DISCOVERY SOURCE */}
      {showAddSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="font-bold text-sm text-crm-dark">Add Discovery Source</h4>
              <button onClick={() => setShowAddSource(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddSource} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Platform / Channel</label>
                <select
                  required
                  value={sourceForm.platformName}
                  onChange={(e) => setSourceForm({ ...sourceForm, platformName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Company Website">Company Website</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Source Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={sourceForm.sourceUrl}
                  onChange={(e) => setSourceForm({ ...sourceForm, sourceUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Any context about how this lead was found..."
                  value={sourceForm.notes}
                  onChange={(e) => setSourceForm({ ...sourceForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSource(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-crm-primary text-white text-xs font-semibold">Save Source</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCHEDULE FOLLOW-UP */}
      {showScheduleFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="font-bold text-sm text-crm-dark">Schedule Follow-up</h4>
              <button onClick={() => setShowScheduleFollowUp(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleScheduleFollowUp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={followUpForm.scheduledDate}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Reason / Notes</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Follow-up on project proposal sent via LinkedIn"
                  value={followUpForm.reason}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowScheduleFollowUp(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-crm-primary text-white text-xs font-semibold">Confirm Date</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG GENERAL MANUAL ACTIVITY (Unchanged) */}
      {showAddActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="font-bold text-sm text-crm-dark">Log Contact Outreach Activity</h4>
              <button onClick={() => setShowAddActivity(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddActivity} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1">Activity Type</label>
                  <select
                    value={activityForm.activityType}
                    onChange={(e) => setActivityForm({ ...activityForm, activityType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
                  >
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="MESSAGE">Message</option>
                    <option value="MEETING">Meeting</option>
                    <option value="REPLY">Reply</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1">Platform</label>
                  <input
                    type="text"
                    value={activityForm.platform}
                    onChange={(e) => setActivityForm({ ...activityForm, platform: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={activityForm.eventTimestamp}
                  onChange={(e) => setActivityForm({ ...activityForm, eventTimestamp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Summary Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discovery call on project specs"
                  value={activityForm.title}
                  onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Detailed Description</label>
                <textarea
                  rows="3"
                  placeholder="Details of the conversation..."
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Outcome (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Positive, Requested demo"
                  value={activityForm.outcome}
                  onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddActivity(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-crm-primary text-white text-xs font-semibold">Save Activity</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT ACTIVITY DESCRIPTION ONLY */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-sm text-crm-dark">Edit Activity Description</h4>
                <p className="text-[11px] text-gray-400">Activity type, title, and timestamp remain immutable</p>
              </div>
              <button onClick={() => setEditingActivity(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="p-2.5 rounded-xl bg-gray-50 text-xs space-y-1 text-gray-600 border border-gray-100">
              <div><strong>Event:</strong> {editingActivity.title}</div>
              <div><strong>Timestamp:</strong> {editingActivity.eventTimestamp ? new Date(editingActivity.eventTimestamp).toLocaleString() : ''}</div>
            </div>

            <form onSubmit={handleEditActivitySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Description Note</label>
                <textarea
                  rows="4"
                  required
                  value={activityEditDesc}
                  onChange={(e) => setActivityEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-crm-primary/20"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-crm-primary text-white text-xs font-semibold hover:bg-crm-primary-hover"
                >
                  Save Description
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT COMPANY */}
      {showEditCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="font-bold text-sm text-crm-dark">Edit Company Details</h4>
              <button onClick={() => setShowEditCompany(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleUpdateCompany} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Official Website</label>
                <input
                  type="url"
                  required
                  value={editForm.officialWebsite}
                  onChange={(e) => setEditForm({ ...editForm, officialWebsite: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editForm.contactPerson}
                  onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditCompany(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="px-4 py-1.5 rounded-lg bg-crm-primary text-white text-xs font-semibold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CONTACT PERSON */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-crm-primary" />
                <h4 className="font-bold text-sm text-crm-dark">Add Contact Person</h4>
              </div>
              <button onClick={() => setShowAddContactModal(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveAddContact} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">
                  Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={addContactForm.personName}
                  onChange={(e) => setAddContactForm({ ...addContactForm, personName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-crm-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Designation / Role</label>
                <input
                  type="text"
                  placeholder="e.g. VP of Engineering, HR Manager"
                  value={addContactForm.designation}
                  onChange={(e) => setAddContactForm({ ...addContactForm, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={addContactForm.email}
                    onChange={(e) => setAddContactForm({ ...addContactForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="+1 555-0199"
                    value={addContactForm.phone}
                    onChange={(e) => setAddContactForm({ ...addContactForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={addContactForm.linkedinUrl}
                  onChange={(e) => setAddContactForm({ ...addContactForm, linkedinUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Initial Pipeline Status</label>
                <select
                  value={addContactForm.initialStatus}
                  onChange={(e) => setAddContactForm({ ...addContactForm, initialStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white"
                >
                  {PIPELINE_STAGES.map((st) => (
                    <option key={st.key} value={st.key}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContactModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-crm-primary text-white text-xs font-semibold shadow-sm hover:bg-crm-primary-hover"
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CONTACT PERSON */}
      {showEditContactModal && editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-crm-primary" />
                <h4 className="font-bold text-sm text-crm-dark">Edit Contact Details</h4>
              </div>
              <button onClick={() => setShowEditContactModal(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveEditContact} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">
                  Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editContactForm.personName}
                  onChange={(e) => setEditContactForm({ ...editContactForm, personName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-crm-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">Designation / Role</label>
                <input
                  type="text"
                  value={editContactForm.designation}
                  onChange={(e) => setEditContactForm({ ...editContactForm, designation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1">Email</label>
                  <input
                    type="email"
                    value={editContactForm.email}
                    onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-crm-dark mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editContactForm.phone}
                    onChange={(e) => setEditContactForm({ ...editContactForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-crm-dark mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={editContactForm.linkedinUrl}
                  onChange={(e) => setEditContactForm({ ...editContactForm, linkedinUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditContactModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-crm-primary text-white text-xs font-semibold shadow-sm hover:bg-crm-primary-hover"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG PERSON OUTREACH ACTIVITY */}
      {showPersonActivityModal && activeContactForActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h4 className="font-bold text-sm text-crm-dark">Log Outreach with {activeContactForActivity.personName}</h4>
                <p className="text-[11px] text-crm-muted">Activity is isolated exclusively to this person's timeline</p>
              </div>
              <button onClick={() => setShowPersonActivityModal(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSavePersonActivity} className="space-y-4">
              {/* Activity Type Buttons */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5">Activity Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'CALL', label: 'Call', icon: PhoneCall },
                    { key: 'EMAIL', label: 'Email', icon: Mail },
                    { key: 'MESSAGE', label: 'Message', icon: MessageSquare },
                    { key: 'MEETING', label: 'Meeting', icon: Video },
                    { key: 'REPLY', label: 'Reply', icon: CornerDownLeft },
                    { key: 'OTHER', label: 'Other', icon: Clock },
                  ].map((btn) => {
                    const Icon = btn.icon;
                    const isSel = personActivityForm.activityType === btn.key;
                    return (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => setPersonActivityForm({ ...personActivityForm, activityType: btn.key })}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSel
                            ? 'bg-crm-primary text-white border-crm-primary shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Platform / Channel Buttons */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1.5">Platform / Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Phone', icon: Phone },
                    { label: 'Laptop', icon: Laptop },
                    { label: 'Tablet', icon: Tablet },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSel = personActivityForm.platform === p.label;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPersonActivityForm({ ...personActivityForm, platform: p.label })}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all ${
                          isSel
                            ? 'bg-crm-primary text-white border-crm-primary shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={personActivityForm.activityDate}
                  onChange={(e) => setPersonActivityForm({ ...personActivityForm, activityDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-crm-primary/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-crm-dark mb-1">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="Briefly describe what happened..."
                  value={personActivityForm.description}
                  onChange={(e) => setPersonActivityForm({ ...personActivityForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs resize-none focus:ring-2 focus:ring-crm-primary/20"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPersonActivityModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-crm-primary text-white text-xs font-semibold shadow-sm hover:bg-crm-primary-hover"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
