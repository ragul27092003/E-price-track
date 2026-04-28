import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../hooks/useApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Rss, LogOut, Plus, Store, Loader2, Users } from 'lucide-react';

const AdminDashboard = () => {
  const { user, logout, switchStore } = useAuth();
  const navigate = useNavigate();

  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const [form, setForm] = useState({ name: '', email: '', password: '', shopName: '' });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data } = await API.get('/auth/all-stores');
      setStores(data);
    } catch (err) {
      console.error('Failed to fetch stores', err);
    } finally {
      setLoadingStores(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);
    try {
      const { data } = await API.post('/auth/signup', form);
      setCreateSuccess(`Store "${data.shopName}" created! Store ID: ${data.store_id}`);
      setForm({ name: '', email: '', password: '', shopName: '' });
      setShowCreateForm(false);
      fetchStores();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create store');
    } finally {
      setCreating(false);
    }
  };

  const handleViewStore = (store) => {
    switchStore(store.store_id, store.shopName);
    navigate('/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="flex items-center h-16 px-6 border-b bg-white dark:bg-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Rss className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">DigitalDataFeed</span>
          <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Super Admin</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-600 dark:text-slate-300">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-700">
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Stores</p>
                  <p className="text-2xl font-bold">{stores.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Store className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Active Stores</p>
                  <p className="text-2xl font-bold">{stores.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Success message */}
        {createSuccess && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
            {createSuccess}
          </div>
        )}

        {/* Stores List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Manage Stores</CardTitle>
            <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="w-4 h-4 mr-1" /> Add Store
            </Button>
          </CardHeader>
          <CardContent>
            {/* Create Store Form */}
            {showCreateForm && (
              <form onSubmit={handleCreate} className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border space-y-3">
                <p className="font-medium text-sm">Create New Store</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input id="shopName" placeholder="e.g. Surya Electronics" value={form.shopName}
                      onChange={(e) => setForm({ ...form, shopName: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ownerName">Owner Name</Label>
                    <Input id="ownerName" placeholder="Owner full name" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ownerEmail">Email</Label>
                    <Input id="ownerEmail" type="email" placeholder="owner@store.com" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ownerPassword">Password</Label>
                    <Input id="ownerPassword" type="password" placeholder="••••••••" value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                </div>
                {createError && (
                  <p className="text-sm text-red-500">{createError}</p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={creating}>
                    {creating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Creating...</> : 'Create Store'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Stores Table */}
            {loadingStores ? (
              <div className="flex items-center justify-center py-8 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading stores...
              </div>
            ) : stores.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No stores yet. Create your first store above.</p>
            ) : (
              <div className="divide-y">
                {stores.map((store) => (
                  <div key={store._id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{store.shopName}</p>
                      <p className="text-sm text-slate-500">{store.email} · <span className="font-mono text-xs">{store.store_id}</span></p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleViewStore(store)}>
                      View Dashboard
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
