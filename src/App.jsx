import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Settings, 
  Key, 
  Plus, 
  Trash2, 
  Download, 
  Play, 
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Type,
  Database,
  Terminal,
  Cpu,
  Copy,
  RefreshCw,
  Clock
} from 'lucide-react';
import Papa from 'papaparse';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { groqService } from './services/groq';
import { geminiService } from './services/gemini';
import GroqService from './services/groq';
import './App.css';

const providerModels = {
  groq: [
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout" },
    { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick" }
  ],
  gemini: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash-Lite" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash (Preview)" }
  ]
};

const DetailsModal = ({ isOpen, onClose, image, activeMode, activeProvider, onRegenerate }) => {
  if (!isOpen || !image) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal details-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Image Details</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{image.file.name}</p>
          </div>
          <X size={24} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose} />
        </div>
        
        <div className="details-modal-content">
          <div className="details-image-view">
            <img src={image.preview} alt="Large preview" />
          </div>
          <div className="details-info-view">
            {image.status === 'done' ? (
              activeMode === 'metadata' && image.metadata ? (
                <div className="details-sections">
                  <div className="detail-section">
                    <div className="section-header">
                      <p className="section-title">Title</p>
                      <button className="copy-btn-small" onClick={() => copyToClipboard(image.metadata.title)}>
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <p className="detail-text">{image.metadata.title}</p>
                  </div>

                  <div className="detail-section">
                    <div className="section-header">
                      <p className="section-title">Description</p>
                      <button className="copy-btn-small" onClick={() => copyToClipboard(image.metadata.description)}>
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <p className="detail-text">{image.metadata.description}</p>
                  </div>

                  <div className="detail-section">
                    <div className="section-header">
                      <p className="section-title">Keywords ({image.metadata.keywords.length})</p>
                      <button className="copy-btn-small" onClick={() => copyToClipboard(image.metadata.keywords.join(', '))}>
                        <Copy size={14} /> Copy
                      </button>
                    </div>
                    <div className="card-keywords" style={{ maxHeight: 'none', overflow: 'visible' }}>
                      {image.metadata.keywords.map((kw, i) => (
                        <span key={i} className="keyword-tag" style={{ 
                          background: 'rgba(236, 28, 36, 0.1)', 
                          color: '#EC1C24' 
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="detail-section">
                  <div className="section-header">
                    <p className="section-title">Generated Prompt</p>
                    <button className="copy-btn-small" onClick={() => copyToClipboard(image.promptOutput)}>
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                  <p className="detail-text italic">"{image.promptOutput}"</p>
                </div>
              )
            ) : (
              <div className="details-loading">
                <p>Status: {image.status}</p>
                {image.status === 'error' && <p className="error-text">{image.error}</p>}
              </div>
            )}
            
            <div className="details-footer-actions">
                <button 
                  className="regen-btn-full" 
                  onClick={() => onRegenerate(image.id)}
                  disabled={image.status === 'generating'}
                >
                  <RefreshCw size={18} className={image.status === 'generating' ? 'animate-spin' : ''} />
                  {image.status === 'generating' ? 'Regenerating...' : 'Regenerate This Image'}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApiKeysModal = ({ isOpen, onClose, apiKeys, onAddKey, onRemoveKey, activeProvider, setActiveProvider }) => {
  const [newKey, setNewKey] = useState('');
  const [showKeys, setShowKeys] = useState({});
  const [modalProvider, setModalProvider] = useState(activeProvider);

  const toggleKeyVisibility = (idx) => {
    setShowKeys(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>API Keys Management</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Manage your AI provider API keys. Keys are stored locally and securely.
            </p>
          </div>
          <X size={24} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={onClose} />
        </div>
        
        <div className="modal-content">
          <div className="api-management-layout">
            <div className="providers-sidebar">
              <p className="section-title">Select AI Provider</p>
              <div 
                className={`provider-card ${modalProvider === 'groq' ? 'active' : ''}`}
                onClick={() => setModalProvider('groq')}
              >
                <span className="provider-badge badge-free">Free</span>
                <div className="provider-card-header">
                  <Cpu size={20} color="#EC1C24" />
                  <div className="provider-card-info">
                    <h4>Groq</h4>
                    <p>{activeProvider === 'groq' ? 'Active' : 'Set Active'}</p>
                  </div>
                </div>
              </div>
              <div 
                className={`provider-card ${modalProvider === 'gemini' ? 'active' : ''}`}
                onClick={() => setModalProvider('gemini')}
              >
                <span className="provider-badge badge-both">Free & Paid</span>
                <div className="provider-card-header">
                  <Sparkles size={20} color="#EC1C24" />
                  <div className="provider-card-info">
                    <h4>Google Gemini</h4>
                    <p>{activeProvider === 'gemini' ? 'Active' : 'Set Active'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="provider-details">
              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>
                        {modalProvider === 'groq' ? 'Groq Configuration' : 'Gemini Configuration'}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {modalProvider === 'groq' 
                        ? "Groq's advanced AI models for ultrafast image analysis."
                        : "Google's most capable AI models for multimodal tasks."
                    }
                    </p>
                </div>
                {activeProvider !== modalProvider && (
                    <button 
                        onClick={() => setActiveProvider(modalProvider)}
                        style={{ background: '#EC1C24', fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                    >
                        Activate {modalProvider === 'groq' ? 'Groq' : 'Gemini'}
                    </button>
                )}
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <p className="section-title">Add New Key</p>
                <div className="api-input-wrapper">
                  <input 
                    type="password" 
                    placeholder={`Enter ${modalProvider === 'groq' ? 'Groq' : 'Gemini'} API key`}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && newKey.trim()) {
                            onAddKey(modalProvider, newKey.trim());
                            setNewKey('');
                        }
                    }}
                  />
                  <button 
                    onClick={() => {
                        if (newKey.trim()) {
                            onAddKey(modalProvider, newKey.trim());
                            setNewKey('');
                        }
                    }} 
                    style={{ background: '#EC1C24', padding: '0.75rem' }}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <a 
                  href={modalProvider === 'groq' ? "https://console.groq.com/keys" : "https://aistudio.google.com/app/apikey"}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.75rem', color: '#EC1C24', textDecoration: 'none', display: 'inline-block', marginTop: '0.75rem' }}
                >
                  <Terminal size={12} style={{ marginRight: '4px' }} /> Get {modalProvider === 'groq' ? 'Groq' : 'Gemini'} API Key
                </a>
              </div>

              <div>
                <p className="section-title">Stored Keys ({apiKeys[modalProvider]?.length || 0})</p>
                <div className="stored-keys-container">
                  {(apiKeys[modalProvider] || []).map((key, idx) => (
                    <div key={idx} className="stored-key-item">
                      <code style={{ fontSize: '0.85rem' }}>
                        {showKeys[idx] ? key : `••••••••${key.slice(-4)}`}
                      </code>
                      <div className="key-actions">
                        {showKeys[idx] ? 
                          <EyeOff size={16} onClick={() => toggleKeyVisibility(idx)} /> : 
                          <Eye size={16} onClick={() => toggleKeyVisibility(idx)} />
                        }
                        <Trash2 size={16} className="trash" onClick={() => onRemoveKey(modalProvider, key)} />
                      </div>
                    </div>
                  ))}
                  {(apiKeys[modalProvider]?.length || 0) === 0 && (
                    <p style={{ textAlign: 'center', color: '#444', fontSize: '0.85rem', padding: '2rem' }}>
                      No keys stored. Add an API key to start generating.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const RangeSlider = ({ min, max, value, onChange, label, unit }) => {
  const minPos = ((value[0] - min) / (max - min)) * 100;
  const maxPos = ((value[1] - min) / (max - min)) * 100;

  return (
    <div className="control-item">
      <div className="control-label">
        <span>{label}</span>
        <span className="control-value">{value[0]} - {value[1]} {unit}</span>
      </div>
      <div className="range-slider-wrapper">
        <div className="range-slider-track" />
        <div 
          className="range-slider-progress" 
          style={{ 
            left: `${minPos}%`, 
            right: `${100 - maxPos}%` 
          }} 
        />
        <div className="range-input-container">
          <input 
            type="range" 
            min={min} 
            max={max} 
            value={value[0]} 
            onChange={(e) => {
              const val = Math.min(parseInt(e.target.value), value[1] - 1);
              onChange([val, value[1]]);
            }}
          />
          <input 
            type="range" 
            min={min} 
            max={max} 
            value={value[1]} 
            onChange={(e) => {
              const val = Math.max(parseInt(e.target.value), value[0] + 1);
              onChange([value[0], val]);
            }}
          />
        </div>
      </div>
    </div>
  );
};

const Switch = ({ enabled, onChange }) => {
  return (
    <div 
      className={`switch-container ${enabled ? 'active' : ''}`} 
      style={{ background: enabled ? '#EC1C24' : 'rgba(255, 255, 255, 0.1)' }}
      onClick={() => onChange(!enabled)}
    >
      <div className="switch-handle" />
    </div>
  );
};

         {/* Custom Select for AI Model to avoid OS blue highlight */}
const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.id === value) || options[0];

  return (
    <div className="custom-select-wrapper" style={{ position: 'relative', width: '100%', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
      <div 
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#323031',
          border: `1px solid ${isOpen ? '#EC1C24' : 'var(--border-color)'}`,
          borderRadius: '10px',
          padding: '0.75rem',
          color: 'white',
          fontSize: '0.875rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'border-color 0.2s'
        }}
      >
        {selectedOption.name}
        <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </div>
      
      {isOpen && (
        <div 
          className="custom-select-options"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#323031',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            overflow: 'hidden',
            zIndex: 50,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}
        >
          {options.map((option) => (
            <div
              key={option.id}
              className="custom-select-option"
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              style={{
                padding: '0.75rem',
                color: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer',
                background: 'transparent',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                // Apply red hover to ALL items when hovered
                e.target.style.background = '#EC1C24';
              }}
              onMouseLeave={(e) => {
                // Revert background to transparent
                e.target.style.background = 'transparent';
              }}
            >
              {option.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const App = () => {
  const [images, setImages] = useState([]);
  const [apiKeys, setApiKeys] = useState(() => {
    const saved = localStorage.getItem('dmatadata_keys_v2');
    if (saved) return JSON.parse(saved);
    const oldSaved = localStorage.getItem('dmatadata_keys');
    if (oldSaved) return { groq: JSON.parse(oldSaved), gemini: [] };
    return { groq: [], gemini: [] };
  });
  const [activeProvider, setActiveProvider] = useState(() => {
    return localStorage.getItem('dmatadata_active_provider') || 'groq';
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMode, setActiveMode] = useState('metadata'); 
  const [showModal, setShowModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('miti_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginEmail, setLoginEmail] = useState('');

  const handleLoginSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const googleUser = {
        name: decoded.name,
        email: decoded.email,
        avatar: decoded.picture
      };
      setUser(googleUser);
      localStorage.setItem('miti_user', JSON.stringify(googleUser));
    } catch (error) {
      console.error('Failed to decode Google JWT:', error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('miti_user');
  };

  // Settings
  const [titleLen, setTitleLen] = useState([20, 200]);
  const [descLen, setDescLen] = useState([100, 150]);
  const [keywordCount, setKeywordCount] = useState([10, 50]);
  const [isSingleKeyword, setIsSingleKeyword] = useState(false);
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-4-scout-17b-16e-instruct");
  const [promptLen, setPromptLen] = useState([400, 600]);

  // Prefix & Suffix Settings
  const [prefixEnabled, setPrefixEnabled] = useState(false);
  const [prefixText, setPrefixText] = useState('');
  const [suffixEnabled, setSuffixEnabled] = useState(false);
  const [suffixText, setSuffixText] = useState('');

  useEffect(() => {
    localStorage.setItem('dmatadata_keys_v2', JSON.stringify(apiKeys));
    localStorage.setItem('dmatadata_active_provider', activeProvider);
    groqService.setApiKeys(apiKeys.groq || []);
    geminiService.setApiKeys(apiKeys.gemini || []);
    
    // Ensure selected model belongs to active provider
    if (!providerModels[activeProvider].some(m => m.id === selectedModel)) {
        setSelectedModel(providerModels[activeProvider][0].id);
    }
  }, [apiKeys, activeProvider, selectedModel]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      metadata: null,
      promptOutput: null,
      error: null
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const addApiKey = (provider, key) => {
    if (key && !apiKeys[provider].includes(key)) {
      setApiKeys(prev => ({
        ...prev,
        [provider]: [...prev[provider], key]
      }));
    }
  };

  const removeApiKey = (provider, key) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: prev[provider].filter(k => k !== key)
    }));
  };

  const deleteImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const generateSingle = async (imgId) => {
    const currentKeys = apiKeys[activeProvider];
    if (!currentKeys || currentKeys.length === 0) {
      setShowModal(true);
      return;
    }

    const img = images.find(i => i.id === imgId);
    if (!img) return;

    setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'generating', error: null } : i));

    const service = activeProvider === 'groq' ? groqService : geminiService;

    // Calculate Prefix/Suffix impact
    const preText = prefixEnabled ? prefixText.trim() : '';
    const sufText = suffixEnabled ? suffixText.trim() : '';
    const fixedLen = (preText ? preText.length + 1 : 0) + (sufText ? sufText.length + 1 : 0);
    
    // Adjust target length for AI (Give it a slightly tighter window so smart-truncation is safer)
    // Always aim slightly above the min to ensure complete sentence.
    const adjustedTitleLen = [
      Math.max(10, titleLen[0] - fixedLen + 5),
      Math.max(20, titleLen[1] - fixedLen)
    ];

    try {
      const base64 = await GroqService.fileToBase64(img.file);
      
      let result;
        if (activeMode === 'metadata') {
           const isPng = img.file.type === 'image/png';
           result = await service.generateMetadata(base64, {
             titleLen: adjustedTitleLen,
             descLen,
             keywordCount,
             isSingleKeyword,
             isPng,
             model: selectedModel
           });

          // Apply Prefix and Suffix and ENFORCE STRICT LIMITS
          let finalTitle = (result.title || '').trim().replace(/\.+$/, '');
          if (preText) finalTitle = `${preText} ${finalTitle}`.trim();
          if (sufText) finalTitle = `${finalTitle} ${sufText}`.trim();

          // Extreme Truncation if still too long
          if (finalTitle.length > titleLen[1]) {
            let truncated = finalTitle.substring(0, titleLen[1]);
            
            // Try to truncate at the last punctuation mark to keep it sentence-like
            const lastPunc = Math.max(truncated.lastIndexOf(','), truncated.lastIndexOf(';'), truncated.lastIndexOf('-'));
            if (lastPunc > titleLen[0]) {
               truncated = truncated.substring(0, lastPunc);
            } else {
               // Fallback: Smart truncate to last complete word
               const lastSpaceIndex = truncated.lastIndexOf(' ');
               if (lastSpaceIndex > Math.max(0, titleLen[0] - 20)) {
                   truncated = truncated.substring(0, lastSpaceIndex);
               }
            }
            
            // remove trailing junk
            truncated = truncated.replace(/[,;\-\s.]+$/, '');
            finalTitle = truncated.trim();
          }
          
          // Ensure no trailing period
          finalTitle = finalTitle.replace(/\.+$/, '');
          // Padding if too short (extra spaces or dots as last resort, but AI should handle min)
          console.warn("Title below minimum", finalTitle.length, titleLen[0]);

          // Enforce Keyword Count
          let finalKeywords = result.keywords || [];
          if (finalKeywords.length > keywordCount[1]) {
            finalKeywords = finalKeywords.slice(0, keywordCount[1]);
          }

          // Enforce Description Length
          let finalDesc = result.description || '';
          if (finalDesc.length > descLen[1]) {
            finalDesc = finalDesc.substring(0, descLen[1]).trim();
          }

          setImages(prev => prev.map(i => i.id === img.id ? { 
            ...i, 
            status: 'done', 
            metadata: { 
              title: finalTitle,
              keywords: finalKeywords,
              description: finalDesc
            } 
          } : i));
        } else {
          result = await service.generatePrompt(base64, {
            model: selectedModel,
            promptLen
          });
          setImages(prev => prev.map(i => i.id === img.id ? { 
            ...i, 
            status: 'done', 
            promptOutput: result 
          } : i));
        }
    } catch (error) {
      setImages(prev => prev.map(i => i.id === img.id ? { 
        ...i, 
        status: 'error', 
        error: error.message 
      } : i));
    }
  };

  const generateAll = async () => {
    const currentKeys = apiKeys[activeProvider];
    if (!currentKeys || currentKeys.length === 0) {
      setShowModal(true);
      return;
    }

    setIsGenerating(true);
    const pendingImages = images.filter(img => img.status !== 'done');
    setStats({ total: pendingImages.length, completed: 0 });

    const service = activeProvider === 'groq' ? groqService : geminiService;

    // Calculate Prefix/Suffix impact
    const preText = prefixEnabled ? prefixText.trim() : '';
    const sufText = suffixEnabled ? suffixText.trim() : '';
    const fixedLen = (preText ? preText.length + 1 : 0) + (sufText ? sufText.length + 1 : 0);
    
    const adjustedTitleLen = [
      Math.max(10, titleLen[0] - fixedLen),
      Math.max(20, titleLen[1] - fixedLen)
    ];

    for (const img of pendingImages) {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, status: 'generating' } : i));

      try {
        const base64 = await GroqService.fileToBase64(img.file);
        
        let result;
        if (activeMode === 'metadata') {
            const isPng = img.file.type === 'image/png';
            result = await service.generateMetadata(base64, {
              titleLen: adjustedTitleLen,
              descLen,
              keywordCount,
              isSingleKeyword,
              isPng,
              model: selectedModel
            });

            // Apply Prefix and Suffix and ENFORCE STRICT LIMITS
            let finalTitle = (result.title || '').trim().replace(/\.+$/, '');
            if (preText) finalTitle = `${preText} ${finalTitle}`.trim();
            if (sufText) finalTitle = `${finalTitle} ${sufText}`.trim();

            // Extreme Truncation if still too long
            if (finalTitle.length > titleLen[1]) {
              let truncated = finalTitle.substring(0, titleLen[1]);
              
              // Try to truncate at the last punctuation mark to keep it sentence-like
              const lastPunc = Math.max(truncated.lastIndexOf(','), truncated.lastIndexOf(';'), truncated.lastIndexOf('-'));
              if (lastPunc > titleLen[0]) {
                 truncated = truncated.substring(0, lastPunc);
              } else {
                 // Fallback: Smart truncate to last complete word
                 const lastSpaceIndex = truncated.lastIndexOf(' ');
                 if (lastSpaceIndex > Math.max(0, titleLen[0] - 20)) {
                     truncated = truncated.substring(0, lastSpaceIndex);
                 }
              }
              
              // remove trailing junk
              truncated = truncated.replace(/[,;\-\s.]+$/, '');
              finalTitle = truncated.trim();
            }
            
            // Ensure no trailing period
            finalTitle = finalTitle.replace(/\.+$/, '');

            // Enforce Keyword Count
            let finalKeywords = result.keywords || [];
            if (finalKeywords.length > keywordCount[1]) {
              finalKeywords = finalKeywords.slice(0, keywordCount[1]);
            }

            // Enforce Description Length
            let finalDesc = result.description || '';
            if (finalDesc.length > descLen[1]) {
              finalDesc = finalDesc.substring(0, descLen[1]).trim();
            }

          setImages(prev => prev.map(i => i.id === img.id ? { 
            ...i, 
            status: 'done', 
            metadata: { 
              title: finalTitle,
              keywords: finalKeywords,
              description: finalDesc
            } 
          } : i));
        } else {
           result = await service.generatePrompt(base64, {
            model: selectedModel,
            promptLen
          });
          setImages(prev => prev.map(i => i.id === img.id ? { 
            ...i, 
            status: 'done', 
            promptOutput: result 
          } : i));
        }
        
        setStats(prev => ({ ...prev, completed: prev.completed + 1 }));

        if (pendingImages.indexOf(img) < pendingImages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }

      } catch (error) {
        setImages(prev => prev.map(i => i.id === img.id ? { 
          ...i, 
          status: 'error', 
          error: error.message 
        } : i));
      }
    }

    setIsGenerating(false);
  };

  const exportCsv = () => {
    const processedImages = images.filter(img => img.status === 'done');
    
    if (processedImages.length === 0) {
      alert("No processed images to export.");
      return;
    }

    const data = processedImages.map(img => {
      const fileName = img.file.name;

      if (activeMode === 'metadata' && img.metadata) {
        return {
          Filename: fileName,
          Title: img.metadata.title,
          Keywords: img.metadata.keywords.join(', ')
        };
      } else if (activeMode === 'prompt' && img.promptOutput) {
        return {
          Filename: fileName,
          Generated_Prompt: img.promptOutput
        };
      }
      return null;
    }).filter(Boolean);

    try {
      const columns = activeMode === 'metadata' 
        ? ['Filename', 'Title', 'Keywords']
        : ['Filename', 'Generated_Prompt'];

      const csv = Papa.unparse(data, {
        columns: columns
      });
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "GFX_Metadata.csv");
      link.style.display = "none";
      document.body.appendChild(link);
      
      link.click();
      
      // Delay cleanup to ensure the browser has time to start the download with the correct filename
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 5000);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export CSV. Please check browser console.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      {!user && (
        <div className="login-overlay">
          <div className="login-card">
            <div className="login-logo">
              <div style={{ background: 'rgba(236, 28, 36, 0.1)', padding: '1rem', borderRadius: '50%' }}>
                <img src="/logo.svg" alt="GFX Metadata" style={{ width: '48px', height: '48px' }} />
              </div>
              <h1 className="login-logo-text">GFX Metadata</h1>
            </div>
            
            <div className="login-input-group">
              <label className="login-label">Email Address</label>
              <input 
                type="email" 
                className="login-input" 
                placeholder="Enter your email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>

            <div className="login-divider">
              <span>Or continue with</span>
            </div>

            <div className="google-login-wrapper">
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={() => console.log('Login Failed')}
                useOneTap
                auto_select
                theme="filled_black"
                shape="pill"
                text="signin_with"
                width="320"
              />
            </div>
          </div>
        </div>
      )}
      <div className={`app-container ${!user ? 'blurred-auth' : ''}`}>
      <ApiKeysModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        apiKeys={apiKeys}
        onAddKey={addApiKey}
        onRemoveKey={removeApiKey}
        activeProvider={activeProvider}
        setActiveProvider={setActiveProvider}
      />

      <DetailsModal 
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        image={selectedImage}
        activeMode={activeMode}
        activeProvider={activeProvider}
        onRegenerate={generateSingle}
      />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-card">
          <div className="logo">
            <img src="/logo.svg" alt="GFX Metadata" style={{ width: '28px', height: '28px' }} />
            GFX Metadata
          </div>

          <div className="sidebar-api-section" onClick={() => setShowModal(true)}>
            <div className="api-section-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Key size={18} color="var(--text-secondary)" />
                  <span className="api-section-title">API Keys</span>
              </div>
              <div className={`api-provider-badge badge-${activeProvider}`}>
                  {activeProvider}
              </div>
            </div>
          </div>

          <div className="control-group-compact">
            <p className="section-title">Model Selection</p>
            <CustomSelect 
                  value={selectedModel} 
                  onChange={setSelectedModel}
                  options={providerModels[activeProvider]}
            />

            <div className="mode-toggle-group">
              <button 
                className={`mode-btn ${activeMode === 'metadata' ? 'active' : ''}`}
                onClick={() => setActiveMode('metadata')}
              >
                <Database size={16} /> Metadata
              </button>
              <button 
                className={`mode-btn ${activeMode === 'prompt' ? 'active' : ''}`}
                onClick={() => setActiveMode('prompt')}
              >
                <Sparkles size={16} /> Prompt
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-spacer" />

        <div className="sidebar-card">
          {activeMode === 'metadata' ? (
            <>
              <div className="control-group">
                  <p className="section-title">Length Constraints</p>
                  <RangeSlider 
                    label="Title Length" 
                    unit="chars" 
                    min={20} 
                    max={200} 
                    value={titleLen} 
                    onChange={setTitleLen} 
                  />
                  <RangeSlider 
                    label="Description Length" 
                    unit="chars" 
                    min={100} 
                    max={150} 
                    value={descLen} 
                    onChange={setDescLen} 
                  />
                  <RangeSlider 
                    label="Keyword Count" 
                    unit="words" 
                    min={10} 
                    max={50} 
                    value={keywordCount} 
                    onChange={setKeywordCount} 
                  />
              </div>
                  
                  <div className="control-item" style={{ marginTop: '1rem' }}>
                      <div className="control-label">
                          <span>Single Keywords</span>
                          <Switch enabled={isSingleKeyword} onChange={setIsSingleKeyword} />
                      </div>
                  </div>
  
                  <div className="prefix-suffix-container" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="control-item">
                          <div className="control-label" style={{ marginBottom: '0.5rem' }}>
                              <span>Prefix</span>
                              <Switch enabled={prefixEnabled} onChange={setPrefixEnabled} />
                          </div>
                          {prefixEnabled && (
                              <div className="prefix-suffix-input-wrapper">
                                  <input 
                                      className="prefix-suffix-input"
                                      type="text" 
                                      placeholder="Add Before Title"
                                      style={{ borderColor: '#EC1C24' }}
                                      value={prefixText}
                                      onChange={(e) => setPrefixText(e.target.value)}
                                  />
                              </div>
                          )}
                      </div>
  
                      <div className="control-item">
                          <div className="control-label" style={{ marginBottom: '0.5rem' }}>
                              <span>Suffix</span>
                              <Switch enabled={suffixEnabled} onChange={setSuffixEnabled} />
                          </div>
                          {suffixEnabled && (
                              <div className="prefix-suffix-input-wrapper">
                                  <input 
                                      className="prefix-suffix-input"
                                      type="text" 
                                      placeholder="Add After Title"
                                      style={{ borderColor: '#EC1C24' }}
                                      value={suffixText}
                                      onChange={(e) => setSuffixText(e.target.value)}
                                  />
                              </div>
                          )}
                      </div>
                  </div>
            </>
          ) : (
            <>
              <div className="control-group">
                  <p className="section-title">Prompt Constraints</p>
                  <RangeSlider 
                    label="Prompt Length" 
                    unit="chars" 
                    min={400} 
                    max={600} 
                    value={promptLen} 
                    onChange={setPromptLen} 
                  />
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Powered by {activeProvider === 'groq' ? 'Groq Vision Llama 4' : 'Google Gemini 2.5/3.x'}
            </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="action-bar">
          <div className="stats" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {images.length > 0 && (
              <span>{images.length} images loaded • {images.filter(i => i.status === 'done').length} processed</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {user && (
              <div className="user-profile-bar">
                <img src={user.avatar} alt={user.name} className="user-avatar-small" />
                <span className="user-name-small">{user.name}</span>
                <button className="logout-btn-minimal" onClick={handleLogout} title="Logout">
                  <X size={14} />
                </button>
              </div>
            )}

            {images.length > 0 && (
              <button className="secondary" onClick={() => setImages([])}>
                <Trash2 size={18} /> Clear
              </button>
            )}
            <button 
                onClick={generateAll} 
                disabled={isGenerating || images.length === 0}
                className={isGenerating ? 'generating-pulse' : ''}
                style={{ background: '#EC1C24' }}
            >
              {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              {isGenerating ? `Generating (${stats.completed}/${stats.total})` : (activeMode === 'metadata' ? 'Generate Metadata' : 'Generate Prompts')}
            </button>
            <button 
                className="secondary" 
                onClick={exportCsv}
                disabled={!images.some(img => img.status === 'done')}
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </header>

        {images.length === 0 ? (
          <label className="upload-zone" style={{ borderStyle: 'dotted', background: 'transparent' }}>
            <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <div style={{ background: 'rgba(236, 28, 36, 0.1)', padding: '2rem', borderRadius: '50%', marginBottom: '1rem' }}>
              <Upload size={48} color="#EC1C24" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>Drop images here or click to upload</h2>
            <p style={{ marginTop: '0.5rem' }}>Bulk generation with {activeProvider === 'groq' ? 'Groq' : 'Gemini'}</p>
          </label>
        ) : (
          <div className="image-grid">
            {images.map(img => (
              <div key={img.id} className="card-horizontal">
                {/* Left: Image Section */}
                <div className="card-left">
                  <div className="card-image-box">
                    <img src={img.preview} alt="Preview" className="card-img-main" onClick={() => setSelectedImage(img)} />
                    <button className="card-delete-btn" onClick={() => deleteImage(img.id)} title="Delete Image">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="file-meta-info">
                    <p className="file-name-label">{img.file.name}</p>
                    <p className="file-size-label">Size: {formatFileSize(img.file.size)} → {img.metadata ? '11.9KB' : '...'}</p>
                  </div>
                </div>

                {/* Right: Content Section */}
                <div className="card-right">
                  <div className="metadata-field">
                    <div className="field-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {activeMode === 'metadata' ? (
                              <Type size={14} color="var(--text-secondary)" />
                            ) : (
                              <div style={{ 
                                width: '14px', 
                                height: '14px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontSize: '12px', 
                                fontWeight: '900',
                                color: 'var(--text-secondary)'
                              }}>P</div>
                            )}
                            <span className="field-label">{activeMode === 'metadata' ? 'Title' : 'Prompt'}</span>
                        </div>
                        <span className="char-count">
                          {activeMode === 'metadata' 
                            ? (img.metadata?.title?.length || 0) 
                            : (img.promptOutput?.length || 0)
                          } characters
                        </span>
                    </div>
                    <div className="title-box-mockup">
                      {img.status === 'done' ? (
                        activeMode === 'metadata' ? img.metadata?.title : img.promptOutput
                      ) : (
                        <span style={{ color: '#444' }}>{img.status === 'generating' ? 'Analyzing...' : 'Waiting for generation...'}</span>
                      )}
                    </div>
                  </div>

                  {activeMode === 'metadata' && (
                    <div className="metadata-field">
                      <div className="field-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Database size={14} color="var(--text-secondary)" />
                              <span className="field-label">Keywords ({img.metadata?.keywords?.length || 0})</span>
                          </div>
                      </div>
                      <div className="keywords-cloud-mockup">
                        {img.status === 'done' && img.metadata?.keywords ? (
                          img.metadata.keywords.slice(0, 25).map((kw, i) => (
                             <span key={i} className="keyword-pill">{kw}</span>
                          ))
                        ) : (
                          <span style={{ color: '#444' }}>Keywords will appear here</span>
                        )}
                        {img.metadata?.keywords?.length > 25 && <span className="keyword-pill">+{img.metadata.keywords.length - 25} more</span>}
                      </div>
                    </div>
                  )}

                  <div className="card-actions-row">
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="action-btn-outline" onClick={() => copyToClipboard(activeMode === 'metadata' ? (img.metadata?.title || '') : (img.promptOutput || ''))}>
                            <Copy size={16} /> Copy {activeMode === 'metadata' ? 'Title' : 'Prompt'}
                        </button>
                        {activeMode === 'metadata' && (
                          <button className="action-btn-outline" onClick={() => copyToClipboard(img.metadata?.keywords?.join(', ') || '')}>
                              <Copy size={16} /> Copy Keywords
                          </button>
                        )}
                    </div>
                    <button className="action-btn-regen" onClick={() => generateSingle(img.id)}>
                        <Sparkles size={16} /> Regenerate
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <label className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderStyle: 'dashed', minHeight: '300px', background: 'rgba(255,255,255,0.01)' }}>
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Plus size={32} style={{ marginBottom: '0.5rem' }} />
                    <p>Add Images</p>
                </div>
            </label>
          </div>
        )}
      </main>
      </div>
    </>
  );
};

export default App;
