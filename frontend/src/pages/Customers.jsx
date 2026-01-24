import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customers, submissions } from '../api/client';
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Trash2,
  Users,
  Loader2,
  Mail,
  Package,
  Link as LinkIcon,
  FileSpreadsheet,
  X,
  CheckSquare,
} from 'lucide-react';
import { format } from 'date-fns';

function CustomerRow({ customer, onDelete, onSendPortalLink, selected, onSelect }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    setMenuOpen(false);
    try {
      await customers.delete(customer.id);
      onDelete(customer.id);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSendPortalLink = async (e) => {
    e.stopPropagation();
    setSendingLink(true);
    setMenuOpen(false);
    try {
      const res = await customers.sendPortalLink(customer.id);
      alert(`Portal link generated!\n\n${res.data.portalUrl}`);
    } catch (error) {
      console.error('Send portal link failed:', error);
      alert('Failed to generate portal link');
    } finally {
      setSendingLink(false);
    }
  };

  return (
    <tr className={selected ? 'bg-blue-50' : ''}>
      <td onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(customer.id, e.target.checked)}
          className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
        />
      </td>
      <td
        className="cursor-pointer"
        onClick={() => navigate(`/customers/${customer.id}`)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{customer.name}</p>
            <p className="text-xs text-gray-500">{customer.email}</p>
          </div>
        </div>
      </td>
      <td>
        <span className="text-gray-600">{customer.phone || '—'}</span>
      </td>
      <td>
        <div className="flex items-center gap-1 text-gray-600">
          <Package className="w-4 h-4" />
          {customer.total_submissions || 0}
        </div>
      </td>
      <td>
        <span className="text-gray-600">{customer.total_cards || 0}</span>
      </td>
      <td>
        <span className={`badge ${customer.portal_access_enabled ? 'badge-green' : 'badge-gray'}`}>
          {customer.portal_access_enabled ? 'Enabled' : 'Disabled'}
        </span>
      </td>
      <td>
        <span className="text-gray-500">
          {format(new Date(customer.created_at), 'MMM d, yyyy')}
        </span>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100"
          >
            {sendingLink ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 fade-in">
                <Link
                  to={`/customers/${customer.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Link>
                <button
                  onClick={handleSendPortalLink}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <LinkIcon className="w-4 h-4" />
                  Generate Portal Link
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function Customers() {
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importingCSV, setImportingCSV] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState(new Set());
  const [showAddToSubmissionModal, setShowAddToSubmissionModal] = useState(false);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState('');
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const loadCustomers = async () => {
    try {
      const params = search ? { search } : {};
      const res = await customers.list(params);
      setCustomerList(res.data.customers || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadCustomers, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = (id) => {
    setCustomerList(customerList.filter((c) => c.id !== id));
    setSelectedCustomers(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleSelectCustomer = (id, checked) => {
    setSelectedCustomers(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(new Set(customerList.map(c => c.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedCustomers.size;
    if (!confirm(`Delete ${count} customer(s)? This cannot be undone.`)) return;

    try {
      await customers.bulkDelete(Array.from(selectedCustomers));
      setCustomerList(customerList.filter(c => !selectedCustomers.has(c.id)));
      setSelectedCustomers(new Set());
      alert(`Successfully deleted ${count} customer(s)`);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('Failed to delete customers');
    }
  };

  const handleOpenAddToSubmission = async () => {
    setShowAddToSubmissionModal(true);
    setLoadingSubmissions(true);
    try {
      const res = await submissions.list({ limit: 100 });
      setSubmissionsList(res.data.submissions || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleBulkAddToSubmission = async () => {
    if (!selectedSubmission) {
      alert('Please select a submission');
      return;
    }

    try {
      const res = await customers.bulkAddToSubmission(
        Array.from(selectedCustomers),
        selectedSubmission
      );
      alert(res.data.message);
      setShowAddToSubmissionModal(false);
      setSelectedCustomers(new Set());
      setSelectedSubmission('');
    } catch (error) {
      console.error('Bulk add to submission failed:', error);
      alert('Failed to add customers to submission');
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingCSV(true);
    try {
      const text = await file.text();
      const res = await customers.importCSV(text);

      const { imported, skipped, errors } = res.data;
      let message = `Successfully imported ${imported} customer(s)`;
      if (skipped > 0) message += `, skipped ${skipped} duplicate(s)`;
      if (errors && errors.length > 0) {
        message += `\n\n${errors.length} error(s):\n${errors.join('\n')}`;
      }
      alert(message);

      // Reload customers
      await loadCustomers();
    } catch (error) {
      console.error('CSV import failed:', error);
      alert(error.response?.data?.error || 'Failed to import CSV');
    } finally {
      setImportingCSV(false);
      e.target.value = '';
    }
  };

  const allSelected = customerList.length > 0 && selectedCustomers.size === customerList.length;
  const someSelected = selectedCustomers.size > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">Manage your card shop customers</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="btn btn-secondary gap-2 cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">{importingCSV ? 'Importing...' : 'Import CSV'}</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              disabled={importingCSV}
              className="hidden"
            />
          </label>
          <Link to="/customers/new" className="btn btn-primary gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Customer</span>
          </Link>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {someSelected && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">
                {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddToSubmission}
                className="btn btn-primary gap-2"
              >
                <Package className="w-4 h-4" />
                Add to Submission
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn bg-red-600 text-white hover:bg-red-700 gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setSelectedCustomers(new Set())}
                className="btn btn-secondary gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          </div>
        ) : customerList.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search ? 'No matching customers' : 'No customers yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {search
                ? 'Try adjusting your search'
                : 'Add your first customer to get started'}
            </p>
            {!search && (
              <Link to="/customers/new" className="btn btn-primary">
                Add Customer
              </Link>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                    />
                  </th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Submissions</th>
                  <th>Cards</th>
                  <th>Portal</th>
                  <th>Added</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customerList.map((customer) => (
                  <CustomerRow
                    key={customer.id}
                    customer={customer}
                    onDelete={handleDelete}
                    selected={selectedCustomers.has(customer.id)}
                    onSelect={handleSelectCustomer}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {customerList.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {customerList.length} customer{customerList.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Add to Submission Modal */}
      {showAddToSubmissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-brand-600" />
                Add Customers to Submission
              </h3>
              <button
                onClick={() => setShowAddToSubmissionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-4">
                Adding {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} to a submission
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Submission
              </label>
              {loadingSubmissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                </div>
              ) : (
                <select
                  value={selectedSubmission}
                  onChange={(e) => setSelectedSubmission(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="">Choose a submission...</option>
                  {submissionsList.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.psa_submission_number || sub.internal_id} - {sub.customer_name || 'No customer'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBulkAddToSubmission}
                disabled={!selectedSubmission}
                className="flex-1 bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                Add to Submission
              </button>
              <button
                onClick={() => setShowAddToSubmissionModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
