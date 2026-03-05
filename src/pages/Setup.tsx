import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Database,
  Server,
  User,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Shield,
  HardDrive,
  Key,
  Globe,
  Container,
  Monitor,
  Copy,
  ExternalLink,
  Info,
} from 'lucide-react';
import { selfHostedApi, markSetupComplete, getApiUrl } from '@/lib/selfHostedConfig';
import {
  verifyLicenseViaBackend,
  saveLicenseInfo,
  getPlanFromMaxDevices,
  getInstallationId,
  LICENSE_PLANS,
  LICENSE_PORTAL_URL,
  type LicenseInfo,
} from '@/lib/licenseConfig';

type Step = 'welcome' | 'environment' | 'database' | 'admin' | 'license' | 'complete';
type DeploymentType = 'docker' | 'xampp' | 'cpanel';

const DEPLOYMENT_OPTIONS: { id: DeploymentType; label: string; icon: React.ReactNode; desc: string; dbHint: string }[] = [
  {
    id: 'docker',
    label: 'Docker',
    icon: <Container className="w-6 h-6" />,
    desc: 'Docker Compose with internal PostgreSQL',
    dbHint: 'Uses bundled PostgreSQL container',
  },
  {
    id: 'xampp',
    label: 'XAMPP / Local',
    icon: <Monitor className="w-6 h-6" />,
    desc: 'Local server with MySQL/MariaDB',
    dbHint: 'Connect to local MySQL on port 3306',
  },
  {
    id: 'cpanel',
    label: 'cPanel / Hosting',
    icon: <Globe className="w-6 h-6" />,
    desc: 'Shared hosting with cPanel or similar',
    dbHint: 'Use your hosting MySQL database',
  },
];

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [testSuccess, setTestSuccess] = useState(false);
  const [deploymentType, setDeploymentType] = useState<DeploymentType>('docker');
  const [isDockerMode, setIsDockerMode] = useState(false);

  // Database config
  const [dbType, setDbType] = useState<'postgresql' | 'mysql'>('postgresql');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('lifeos');
  const [dbUser, setDbUser] = useState('lifeos');
  const [dbPassword, setDbPassword] = useState('');
  const [dbPrefix, setDbPrefix] = useState('');
  
  // License config
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);

  // Admin config
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminName, setAdminName] = useState('');

  // Check setup status on mount — detect Docker mode
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/setup/status`);
        const data = await res.json();

        if (data.isSetup && !data.needsSetup) {
          // Already set up, redirect to login
          navigate('/auth');
          return;
        }

        if (data.isDocker) {
          setIsDockerMode(true);
          setDeploymentType('docker');
          setDbType(data.dbType || 'postgresql');
          // Docker skips environment + database steps
        }
      } catch {
        // API not available, continue with normal setup
      } finally {
        setCheckingStatus(false);
      }
    };
    checkStatus();
  }, [navigate]);

  const applyDeploymentPresets = (type: DeploymentType) => {
    setDeploymentType(type);
    setTestSuccess(false);

    switch (type) {
      case 'docker':
        setDbType('postgresql');
        setDbHost('postgres');
        setDbPort('5432');
        setDbName('lifeos');
        setDbUser('lifeos');
        setDbPassword('');
        setDbPrefix('');
        break;
      case 'xampp':
        setDbType('mysql');
        setDbHost('localhost');
        setDbPort('3306');
        setDbName('lifeos');
        setDbUser('root');
        setDbPassword('');
        setDbPrefix('');
        break;
      case 'cpanel':
        setDbType('mysql');
        setDbHost('localhost');
        setDbPort('3306');
        setDbName('');
        setDbUser('');
        setDbPassword('');
        setDbPrefix('');
        break;
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setTestSuccess(false);
    try {
      await selfHostedApi.testConnection({
        dbType,
        host: dbHost,
        port: parseInt(dbPort),
        database: dbPrefix ? `${dbPrefix}${dbName}` : dbName,
        username: dbPrefix ? `${dbPrefix}${dbUser}` : dbUser,
        password: dbPassword,
      });
      setTestSuccess(true);
      toast({ title: 'Connection successful!', description: 'Database is reachable.' });
    } catch (err: any) {
      toast({
        title: 'Connection failed',
        description: err.message || 'Could not connect to the database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Docker mode: create admin via dedicated endpoint
  const handleCreateAdmin = async () => {
    if (adminPassword !== adminConfirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (adminPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (!adminEmail.includes('@')) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/setup/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          name: adminName || 'Administrator',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create admin account');
      }

      toast({ title: 'Admin account created!', description: 'Now activate your license.' });
      setStep('license');
    } catch (err: any) {
      toast({
        title: 'Admin creation failed',
        description: err.message || 'Could not create admin account.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Non-Docker: full initialize (DB + admin)
  const handleInitialize = async () => {
    if (adminPassword !== adminConfirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (adminPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (!adminEmail.includes('@')) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await selfHostedApi.initializeDatabase({
        dbType,
        host: dbHost,
        port: parseInt(dbPort),
        database: dbPrefix ? `${dbPrefix}${dbName}` : dbName,
        username: dbPrefix ? `${dbPrefix}${dbUser}` : dbUser,
        password: dbPassword,
        adminEmail,
        adminPassword,
        adminName: adminName || 'Administrator',
      });

      localStorage.setItem('lifeos_db_type', dbType);
      localStorage.setItem('lifeos_deployment_type', deploymentType);
      markSetupComplete();
      setStep('license');
      toast({ title: 'Database initialized!', description: 'Now activate your license.' });
    } catch (err: any) {
      toast({
        title: 'Setup failed',
        description: err.message || 'Could not initialize database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Copied to clipboard.' });
  };

  const stepVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  const handleVerifyLicense = async () => {
    if (!licenseKey.trim()) {
      toast({ title: 'Please enter a license key', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const result = await verifyLicenseViaBackend(licenseKey, '/api');
      if (result.success) {
        const info: LicenseInfo = {
          licenseKey,
          status: (result.actual_status as any) || 'active',
          maxDevices: result.max_devices || 5,
          expiresAt: result.expires_at || null,
          lastVerified: new Date().toISOString(),
          installationId: getInstallationId(),
          plan: getPlanFromMaxDevices(result.max_devices || 5),
        };
        await saveLicenseInfo(info);
        setLicenseInfo(info);
        setLicenseVerified(true);

        // Also call license/setup to mark setup_complete on backend
        try {
          const apiUrl = getApiUrl();
          await fetch(`${apiUrl}/license/setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: licenseKey }),
          });
        } catch {}

        if (isDockerMode) {
          markSetupComplete();
        }

        toast({ title: 'License Activated!', description: `${info.plan} plan activated.` });
      } else {
        toast({ title: 'Verification Failed', description: result.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // handleSkipLicense removed — license is mandatory for all self-hosted installations

  // Docker mode: Welcome → Admin → License → Complete
  // Normal mode: Welcome → Environment → Database → Admin → License → Complete
  const allSteps: Step[] = isDockerMode
    ? ['welcome', 'admin', 'license', 'complete']
    : ['welcome', 'environment', 'database', 'admin', 'license', 'complete'];

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
          >
            <HardDrive className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            <span className="text-primary">LifeOS</span> Setup
          </h1>
          <p className="text-muted-foreground">
            {isDockerMode ? 'Docker installation wizard' : 'Self-hosted installation wizard'}
          </p>
        </div>

        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {allSteps.map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-8 bg-primary' : i < allSteps.indexOf(step) ? 'w-4 bg-primary/60' : 'w-4 bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="glass-card rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {step === 'welcome' && (
              <motion.div key="welcome" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="text-center space-y-4">
                  <Server className="w-12 h-12 text-primary mx-auto" />
                  <h2 className="text-xl font-semibold text-foreground">Welcome to LifeOS</h2>
                  <p className="text-muted-foreground text-sm">
                    {isDockerMode
                      ? 'Your Docker environment is pre-configured. Create your admin account and activate your license to get started.'
                      : 'Set up your self-hosted instance. Choose your deployment environment to get started.'}
                  </p>
                  {isDockerMode && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2">
                      <Container className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>Docker detected — database is pre-configured. You only need to set up your admin account and license key.</span>
                    </div>
                  )}
                  <Button className="w-full mt-4" onClick={() => setStep(isDockerMode ? 'admin' : 'environment')}>
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Environment Selection (non-Docker only) */}
            {step === 'environment' && !isDockerMode && (
              <motion.div key="environment" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Deployment Environment</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select where you're installing LifeOS. This will configure default settings.
                  </p>

                  <div className="space-y-3">
                    {DEPLOYMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => applyDeploymentPresets(opt.id)}
                        className={`w-full p-4 rounded-lg border text-left transition-all flex items-start gap-4 ${
                          deploymentType === opt.id
                            ? 'bg-primary/10 border-primary ring-1 ring-primary/30'
                            : 'bg-muted/30 border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className={`mt-0.5 ${deploymentType === opt.id ? 'text-primary' : 'text-muted-foreground'}`}>
                          {opt.icon}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${deploymentType === opt.id ? 'text-primary' : 'text-foreground'}`}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                            <Database className="w-3 h-3" /> {opt.dbHint}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center ${
                          deploymentType === opt.id ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                        }`}>
                          {deploymentType === opt.id && (
                            <CheckCircle className="w-3.5 h-3.5 text-primary-foreground" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* cPanel quick guide */}
                  {deploymentType === 'cpanel' && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-2">
                      <p className="font-medium text-foreground flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-primary" /> cPanel Setup Steps
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                        <li>Create a MySQL database in cPanel → MySQL Databases</li>
                        <li>Create a database user and assign it to the database</li>
                        <li>Upload the LifeOS files to <code className="text-foreground bg-muted px-1 rounded">public_html</code></li>
                        <li>Set up Node.js App in cPanel (Node.js ≥ 18)</li>
                        <li>Run the install script or use this wizard</li>
                      </ol>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => copyToClipboard(
                            `# cPanel LifeOS Install Script\n# 1. SSH into your server or use cPanel Terminal\n# 2. Navigate to your app directory\ncd ~/public_html\n\n# 3. Install dependencies\nnpm install\n\n# 4. Build the frontend\nnpm run build\n\n# 5. Set environment variables\ncat > .env << 'EOF'\nDB_TYPE=mysql\nDB_HOST=localhost\nDB_PORT=3306\nDB_NAME=your_cpanel_username_lifeos\nDB_USER=your_cpanel_username_lifeos\nDB_PASSWORD=your_db_password\nJWT_SECRET=$(openssl rand -hex 32)\nAPI_PORT=3001\nNODE_ENV=production\nVITE_SELFHOSTED_API_URL=/api\nEOF\n\n# 6. Start the backend\nnode docker/backend/server.js &\n\necho "LifeOS installed! Visit your domain to complete setup."`
                          )}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copy Install Script
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setStep('welcome')}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button className="flex-1" onClick={() => setStep('database')}>
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Database Configuration (non-Docker only) */}
            {step === 'database' && !isDockerMode && (
              <motion.div key="database" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Database Configuration</h2>
                  </div>

                  {deploymentType === 'cpanel' && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">💡 cPanel Database Naming</p>
                      <p>cPanel prefixes database names and usernames with your account name (e.g., <code className="text-foreground bg-muted px-1 rounded">username_lifeos</code>). Enter the prefix and name separately below.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Database Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDbType('postgresql');
                          setDbPort('5432');
                          setTestSuccess(false);
                        }}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          dbType === 'postgresql'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        PostgreSQL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDbType('mysql');
                          setDbPort('3306');
                          setTestSuccess(false);
                        }}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          dbType === 'mysql'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        MySQL / MariaDB
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="dbHost">Server Host</Label>
                      <Input
                        id="dbHost"
                        value={dbHost}
                        onChange={(e) => { setDbHost(e.target.value); setTestSuccess(false); }}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dbPort">Port</Label>
                      <Input
                        id="dbPort"
                        value={dbPort}
                        onChange={(e) => { setDbPort(e.target.value); setTestSuccess(false); }}
                        placeholder={dbType === 'postgresql' ? '5432' : '3306'}
                      />
                    </div>
                  </div>

                  {/* cPanel prefix field */}
                  {deploymentType === 'cpanel' && (
                    <div className="space-y-2">
                      <Label htmlFor="dbPrefix">cPanel Username Prefix</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          id="dbPrefix"
                          value={dbPrefix}
                          onChange={(e) => { setDbPrefix(e.target.value); setTestSuccess(false); }}
                          placeholder="cpanel_user_"
                          className="max-w-[160px]"
                        />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">+ name below</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        e.g. if your cPanel username is <strong>arif</strong>, enter <strong>arif_</strong>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dbName">Database Name</Label>
                    <div className="flex items-center gap-1">
                      {deploymentType === 'cpanel' && dbPrefix && (
                        <span className="text-sm text-muted-foreground font-mono">{dbPrefix}</span>
                      )}
                      <Input
                        id="dbName"
                        value={dbName}
                        onChange={(e) => { setDbName(e.target.value); setTestSuccess(false); }}
                        placeholder="lifeos"
                        className={deploymentType === 'cpanel' && dbPrefix ? 'flex-1' : ''}
                      />
                    </div>
                    {deploymentType === 'cpanel' && dbPrefix && dbName && (
                      <p className="text-xs text-muted-foreground">
                        Full name: <code className="text-foreground bg-muted px-1 rounded">{dbPrefix}{dbName}</code>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="dbUser">Username</Label>
                      <div>
                        {deploymentType === 'cpanel' && dbPrefix && (
                          <p className="text-xs text-muted-foreground mb-1 font-mono">{dbPrefix}</p>
                        )}
                        <Input
                          id="dbUser"
                          value={dbUser}
                          onChange={(e) => { setDbUser(e.target.value); setTestSuccess(false); }}
                          placeholder={deploymentType === 'cpanel' ? 'lifeos' : dbType === 'postgresql' ? 'lifeos' : 'root'}
                        />
                      </div>
                      {deploymentType === 'cpanel' && dbPrefix && dbUser && (
                        <p className="text-xs text-muted-foreground">
                          Full: <code className="text-foreground bg-muted px-1 rounded">{dbPrefix}{dbUser}</code>
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dbPassword">Password</Label>
                      <Input
                        id="dbPassword"
                        type="password"
                        value={dbPassword}
                        onChange={(e) => { setDbPassword(e.target.value); setTestSuccess(false); }}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleTestConnection}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : testSuccess ? (
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    {testSuccess ? 'Connection Verified' : 'Test Connection'}
                  </Button>

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setStep('environment')}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setStep('admin')}
                      disabled={!testSuccess}
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Admin Account */}
            {step === 'admin' && (
              <motion.div key="admin" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Create Admin Account</h2>
                  </div>
                  {isDockerMode && (
                    <p className="text-sm text-muted-foreground">
                      Create your administrator account. You'll use these credentials to log in.
                    </p>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="adminName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="adminName"
                        className="pl-10"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="System Administrator"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Address</Label>
                    <div className="relative">
                      <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="adminEmail"
                        type="email"
                        className="pl-10"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="adminPassword"
                        type="password"
                        className="pl-10"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminConfirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="adminConfirmPassword"
                        type="password"
                        className="pl-10"
                        value={adminConfirmPassword}
                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setStep(isDockerMode ? 'welcome' : 'database')}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={isDockerMode ? handleCreateAdmin : handleInitialize}
                      disabled={loading || !adminEmail || !adminPassword}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {isDockerMode ? 'Create Admin Account' : 'Initialize LifeOS'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: License Activation */}
            {step === 'license' && (
              <motion.div key="license" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Activate License</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter your LifeOS license key to unlock features. Purchase a license from{' '}
                    <a href={LICENSE_PORTAL_URL + '/products.php'} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                      portal.itsupport.com.bd <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>

                  {/* Plan Cards */}
                  <div className="space-y-2">
                    {LICENSE_PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          licenseInfo?.plan === plan.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm text-foreground">{plan.name}</span>
                          <span className="text-xs font-bold text-primary">{plan.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {plan.maxDevices >= 99999 ? 'Unlimited' : `Up to ${plan.maxDevices}`} users • {plan.features[0]}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licenseKey">License Key</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="licenseKey"
                        className="pl-10 font-mono"
                        value={licenseKey}
                        onChange={(e) => { setLicenseKey(e.target.value); setLicenseVerified(false); }}
                        placeholder="LIFEOS-XXXX-XXXX-XXXX"
                      />
                    </div>
                  </div>

                  {licenseVerified && licenseInfo && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                      <p className="text-foreground font-medium flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-primary" /> License Activated!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Plan: <span className="capitalize font-medium">{licenseInfo.plan}</span> •
                        Max Users: {licenseInfo.maxDevices >= 99999 ? 'Unlimited' : licenseInfo.maxDevices}
                        {licenseInfo.expiresAt && ` • Expires: ${new Date(licenseInfo.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleVerifyLicense}
                      disabled={loading || !licenseKey.trim()}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : licenseVerified ? (
                        <CheckCircle className="w-4 h-4 mr-2 text-primary" />
                      ) : (
                        <Shield className="w-4 h-4 mr-2" />
                      )}
                      {licenseVerified ? 'Verified' : 'Verify License'}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setStep('complete')}
                      disabled={!licenseVerified}
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center py-2">
                    A valid license key is required to use LifeOS.{' '}
                    <a href={LICENSE_PORTAL_URL + '/products.php'} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Purchase a license
                    </a>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 6: Complete */}
            {step === 'complete' && (
              <motion.div key="complete" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle className="w-16 h-16 text-primary mx-auto" />
                  </motion.div>
                  <h2 className="text-xl font-semibold text-foreground">Setup Complete!</h2>
                  <p className="text-muted-foreground text-sm">
                    LifeOS has been configured successfully. You can now sign in with your admin credentials.
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border text-left text-sm space-y-1">
                    <p><span className="text-muted-foreground">Environment:</span> <span className="font-medium capitalize">{isDockerMode ? 'Docker' : deploymentType}</span></p>
                    <p><span className="text-muted-foreground">Database:</span> <span className="font-medium">{dbType === 'postgresql' ? 'PostgreSQL' : 'MySQL'}</span></p>
                    {!isDockerMode && (
                      <p><span className="text-muted-foreground">Host:</span> <span className="font-medium">{dbHost}:{dbPort}</span></p>
                    )}
                    <p><span className="text-muted-foreground">Admin:</span> <span className="font-medium">{adminEmail}</span></p>
                    {licenseInfo && (
                      <p><span className="text-muted-foreground">License:</span> <span className="font-medium capitalize">{licenseInfo.plan} Plan</span></p>
                    )}
                  </div>

                  {!isDockerMode && deploymentType === 'cpanel' && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-left text-xs space-y-1">
                      <p className="font-medium text-foreground">🚀 cPanel Next Steps</p>
                      <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                        <li>Set up a cron job to keep the Node.js backend running</li>
                        <li>Configure your domain's SSL certificate</li>
                        <li>Set up the .htaccess proxy rules for the API</li>
                      </ul>
                    </div>
                  )}

                  <Button className="w-full" onClick={() => navigate('/auth')}>
                    Go to Sign In <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          LifeOS Self-Hosted • {isDockerMode ? 'Docker' : deploymentType === 'xampp' ? 'XAMPP' : deploymentType === 'cpanel' ? 'cPanel' : 'Docker'} Mode
        </p>
      </motion.div>
    </div>
  );
}
