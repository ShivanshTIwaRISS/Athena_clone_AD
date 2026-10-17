// src/components/UserManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { listUsers, registerUser } from '../services/api';

export default function UserManagement({ onNavigate: _onNavigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // New User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'candidate' });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(Array.isArray(data) ? data : data?.users || []);
    } catch (err) {
      setError(err.message || 'Failed to retrieve user registry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAddUser(e) {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setModalError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setModalError(null);
    try {
      await registerUser(newUser);
      setIsModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'candidate' });
      fetchUsers();
    } catch (err) {
      setModalError(err.message || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const text = `${u.name || ''} ${u.email || ''}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const candidateCount = users.filter((u) => u.role === 'candidate').length;

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <div className="view-eyebrow">IDENTITY & ACCESS CONTROL</div>
          <h1 className="view-title">User Management</h1>
          <p className="view-subtitle">
            Manage administrative operators and candidate student accounts.
          </p>
        </div>
        <div className="view-actions">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            Add New User
          </button>
        </div>
      </div>

      {error && (
        <div className="banner banner-error mb-4">
          <span className="banner-icon">⚠️</span>
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={fetchUsers}>Retry</button>
        </div>
      )}

      {/* User Stats Row */}
      <div className="metrics-grid mb-4">
        <div className="metric-card metric-violet">
          <div className="metric-body">
            <div className="metric-val">{users.length}</div>
            <div className="metric-label">Total Registered Accounts</div>
          </div>
        </div>
        <div className="metric-card metric-blue">
          <div className="metric-body">
            <div className="metric-val">{adminCount}</div>
            <div className="metric-label">Administrators & Proctors</div>
          </div>
        </div>
        <div className="metric-card metric-emerald">
          <div className="metric-body">
            <div className="metric-val">{candidateCount}</div>
            <div className="metric-label">Candidate Students</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="input search-input"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input select-input"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: '160px' }}
        >
          <option value="all">All Roles</option>
          <option value="admin">Administrators</option>
          <option value="candidate">Candidates</option>
        </select>

        <button className="btn btn-secondary" onClick={fetchUsers} disabled={loading}>
          Refresh
        </button>
      </div>

      {/* User Table */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">
            <div className="spinner mb-2" />
            <p>Loading user directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <p>No user accounts found matching your query.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const uId = u.id || u._id || u.email;
                  return (
                    <tr key={uId}>
                      <td>
                        <div className="d-flex align-center gap-2">
                          <div className="candidate-avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                            {(u.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-primary">{u.name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-sm text-muted">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-neutral'}`}>
                          {u.role === 'admin' ? '🛡️ Admin' : '🎓 Candidate'}
                        </span>
                      </td>
                      <td className="text-muted text-xs">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                      </td>
                      <td>
                        <span className="badge badge-success text-xs">Active</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Account</h3>
              <button className="btn-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            {modalError && (
              <div className="banner banner-error mb-3">
                <span>{modalError}</span>
              </div>
            )}
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. John Doe"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="e.g. student@institution.edu"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label">Initial Password *</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Role</label>
                  <select
                    className="input select-input"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="candidate">Candidate / Student</option>
                    <option value="admin">Administrator / Proctor</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

UserManagement.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};
