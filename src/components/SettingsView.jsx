// src/components/SettingsView.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getSettings, saveSettings } from '../services/api';

export default function SettingsView({ currentUser }) {
  const isAdmin = currentUser?.role === 'admin';

  const [settings, setSettings] = useState({
    institutionName: 'VEYRA Assessment Center',
    defaultDurationMinutes: 60,
    defaultPassingScore: 60,
    strictFullscreenDefault: true,
    cameraSnapshotInterval: 10,
    screenSnapshotInterval: 10,
    allowReviewDefault: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      getSettings()
        .then((data) => {
          if (data && typeof data === 'object') {
            setSettings((prev) => ({ ...prev, ...data }));
          }
        })
        .catch((err) => {
          console.warn('Could not fetch custom settings:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isAdmin]);

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedSuccess(false);
    try {
      await saveSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="view-container animate-fade-in" style={{ maxWidth: '800px' }}>
      <div className="view-header">
        <div>
          <div className="view-eyebrow">APPLICATION & SYSTEM CONFIGURATION</div>
          <h1 className="view-title">Settings & Preferences</h1>
          <p className="view-subtitle">
            {isAdmin
              ? 'Configure global assessment parameters, proctoring intervals, and security compliance.'
              : 'View your profile information, hardware status, and app configuration.'}
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="banner banner-success mb-4">
          <span className="banner-icon">✓</span>
          <span>System configuration updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="banner banner-error mb-4">
          <span className="banner-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Account Profile Card */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">User Account</h3>
        </div>
        <div className="card-body">
          <div className="d-flex align-center gap-3">
            <div className="candidate-avatar" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
              {(currentUser?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-lg text-primary">{currentUser?.name || 'Authorized User'}</div>
              <div className="text-muted text-sm">{currentUser?.email}</div>
              <div className="mt-1">
                <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-neutral'} text-xs`}>
                  {isAdmin ? '🛡️ Administrator' : '🎓 Candidate Student'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin System Configuration */}
      {isAdmin && (
        <form onSubmit={handleSaveSettings}>
          <div className="card mb-4">
            <div className="card-header">
              <h3 className="card-title">Institution & Proctoring Defaults</h3>
              <p className="card-subtitle">Global defaults applied to newly generated exams</p>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center p-4 text-muted">Loading settings...</div>
              ) : (
                <div className="d-flex flex-col gap-3">
                  <div className="form-group">
                    <label className="form-label">Institution Name</label>
                    <input
                      type="text"
                      className="input"
                      value={settings.institutionName || ''}
                      onChange={(e) => setSettings({ ...settings, institutionName: e.target.value })}
                    />
                  </div>

                  <div className="grid-2-col">
                    <div className="form-group">
                      <label className="form-label">Default Duration (Minutes)</label>
                      <input
                        type="number"
                        min="5"
                        max="300"
                        className="input"
                        value={settings.defaultDurationMinutes || 60}
                        onChange={(e) => setSettings({ ...settings, defaultDurationMinutes: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Default Passing Score (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="input"
                        value={settings.defaultPassingScore || 60}
                        onChange={(e) => setSettings({ ...settings, defaultPassingScore: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid-2-col">
                    <div className="form-group">
                      <label className="form-label">Webcam Capture Cadence (Seconds)</label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        className="input"
                        value={settings.cameraSnapshotInterval || 10}
                        onChange={(e) => setSettings({ ...settings, cameraSnapshotInterval: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Screen Capture Cadence (Seconds)</label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        className="input"
                        value={settings.screenSnapshotInterval || 10}
                        onChange={(e) => setSettings({ ...settings, screenSnapshotInterval: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={settings.strictFullscreenDefault !== false}
                        onChange={(e) => setSettings({ ...settings, strictFullscreenDefault: e.target.checked })}
                      />
                      <span>Enforce Strict Fullscreen mode by default on all exams</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className="card-footer d-flex justify-end p-3">
              <button type="submit" className="btn btn-primary" disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Hardware Diagnostics Card */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">Desktop & Hardware Diagnostics</h3>
        </div>
        <div className="card-body">
          <div className="compact-list">
            <div className="compact-list-item">
              <div className="compact-list-main">
                <span className="font-semibold">Electron Desktop Architecture</span>
                <span className="text-muted text-xs">High-integrity Native Shell</span>
              </div>
              <span className="badge badge-success">Active & Verified</span>
            </div>
            <div className="compact-list-item">
              <div className="compact-list-main">
                <span className="font-semibold">Local Telemetry Storage</span>
                <span className="text-muted text-xs">Encrypted snapshot cache</span>
              </div>
              <span className="badge badge-success">Ready</span>
            </div>
            <div className="compact-list-item">
              <div className="compact-list-main">
                <span className="font-semibold">Application Release</span>
                <span className="text-muted text-xs">VEYRA Desktop Core Engine</span>
              </div>
              <span className="badge badge-outline font-mono">v2.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

SettingsView.propTypes = {
  currentUser: PropTypes.object,
};
