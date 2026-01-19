import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { customers } from '../api/client';
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
} from 'lucide-react';
import { format } from 'date-fns';

function CustomerRow({ customer, onDelete, onSendPortalLink }) {
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
    <tr
      className="cursor-pointer"
      onClick={() => navigate(`/customers/${customer.id}`)}
    >
      <td>
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
    </div>
  );
}
