import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { changePassword, deleteCustomerAccount, loadOwnerCollection, loadOwnerSettings, registerSupplier, saveOwnerCollection, saveOwnerSettings, signInOwner, signInSupplier, signOutOwner, signOutSupplier, SupplierMessage, SupplierProduct, SupplierProfile, SupplyOrder } from './src/backend';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function Dashboard({ onOpenOrders, onOpenReports, onOpenUsers, onOpenSettings, onOpenNotifications, onOpenInventory, onOpenMessages }: { onOpenOrders: () => void; onOpenReports: () => void; onOpenUsers: () => void; onOpenSettings: () => void; onOpenNotifications: () => void; onOpenInventory: () => void; onOpenMessages: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const refreshDashboard = async () => {
      const [savedProducts, savedOrders] = await Promise.all([
        loadOwnerCollection<Product[]>('products', []),
        loadOwnerCollection<Order[]>('orders', []),
      ]);
      setProducts(savedProducts);
      setOrders(savedOrders);
    };

    void refreshDashboard();
    const timer = setInterval(() => { void refreshDashboard(); }, 3000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date();
  const todayOrders = orders.filter((order) => {
    const orderDate = new Date(order.date);
    return !Number.isNaN(orderDate.getTime())
      && orderDate.toDateString() === today.toDateString();
  });
  const todaysSales = todayOrders
    .filter((order) => order.status !== 'Cancelled')
    .reduce((total, order) => total + (Number(order.amount.replace(/[^0-9.-]/g, '')) || 0), 0);
  const activeOrders = todayOrders.filter((order) => !['Completed', 'Cancelled'].includes(order.status));
  const preOrders = orders.filter((order) => order.type === 'Pre-Order' && !['Completed', 'Cancelled'].includes(order.status));
  const lowStockProducts = products.filter((product) => product.stock <= 10);
  const recentPreOrders = [...preOrders]
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 2);
  const stockByProduct = products.slice(0, 3);
  const formatCurrency = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.ownerHeader}>
        <View style={styles.ownerBrand}>
          <Text style={styles.ownerLogo}>GL</Text>
          <Text style={styles.ownerTitle}>Dashboard</Text>
        </View>
        <View style={styles.ownerHeaderActions}>
          <Pressable onPress={onOpenNotifications}><Text style={styles.bell}>♧</Text></Pressable>
          <Pressable onPress={onOpenSettings} accessibilityLabel="System settings"><Text style={styles.bell}>⚙</Text></Pressable>
          <Pressable style={styles.avatar} onPress={onOpenUsers} accessibilityLabel="User management">
            <Text style={styles.avatarText}>OW</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.snapshotHeading}>
        <Text style={styles.eyebrow}>STORE OPERATIONS</Text>
        <View style={styles.snapshotRow}>
          <Text style={styles.snapshotTitle}>Store Snapshot</Text>
          <View style={styles.syncPill}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Live sync</Text>
          </View>
        </View>
      </View>

      <View style={styles.ownerMetricsGrid}>
        <OwnerMetric title="Today's Sales" value={formatCurrency(todaysSales)} note={`${todayOrders.length} orders today`} icon="▣" />
        <OwnerMetric title="Orders Today" value={String(todayOrders.length)} note={`${activeOrders.length} active`} icon="▢" />
        <OwnerMetric title="Pre-Orders" value={String(preOrders.length)} note="Awaiting fulfilment" icon="▤" />
        <OwnerMetric title="Stock Alert" value={`${lowStockProducts.length} Items`} note="Needs reorder" icon="△" warning />
      </View>

      <View style={styles.ownerPanel}>
        <Pressable onPress={onOpenReports}>
          <PanelHeading title="Sales — Last 7 Days" subtitle="Daily gross revenue breakdown" action="View report›" />
        </Pressable>
        <View style={styles.chartEmptyState}>
          <Text style={styles.panelSubtitle}>{orders.length ? `${orders.length} orders recorded` : 'No sales recorded yet'}</Text>
          <Text style={styles.chartEmptyValue}>{formatCurrency(todaysSales)}</Text>
        </View>
        <View style={styles.days}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <Text key={day} style={styles.day}>{day}</Text>
          ))}
        </View>
      </View>

      <View style={styles.ownerPanel}>
        <PanelHeading title="Stock Levels by Category" subtitle={`${products.length} products in inventory`} action="View all›" />
        {stockByProduct.length ? stockByProduct.map((product) => (
          <StockBar key={product.name} label={product.name} value={`${product.stock} units`} progress={Math.min(product.stock / 100, 1)} warning={product.stock <= 10} />
        )) : <Text style={styles.panelSubtitle}>No products recorded yet</Text>}
      </View>

      <View style={styles.ownerPanel}>
        <PanelHeading title="Pre-Order Queue" subtitle="Scheduled curbside collections" action="See all›" />
        {recentPreOrders.length ? recentPreOrders.map((order) => (
          <QueueItem key={order.id} initials={order.customer.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()} name={order.customer} detail={`${order.id} • ${order.items}`} status={order.status} preparing={order.status === 'Preparing'} />
        )) : <Text style={styles.panelSubtitle}>No pre-orders awaiting fulfilment</Text>}
      </View>

      <View style={styles.storeStatus}>
        <Text style={styles.storeStatusText}>▥ Store Status: <Text style={styles.openText}>Synced</Text></Text>
        <Pressable style={styles.newSale} onPress={onOpenOrders}>
          <Text style={styles.newSaleText}>＋ New Sale</Text>
        </Pressable>
      </View>

      <View style={styles.bottomNav}>
        {[
          ['▦', 'Home'],
          ['🛒', 'Inventory'],
          ['▤', 'Orders'],
          ['□', 'Messages'],
        ].map(([icon, label], index) => (
          <Pressable key={label} style={styles.navItem} onPress={index === 1 ? onOpenInventory : index === 2 ? onOpenOrders : index === 3 ? onOpenMessages : undefined}>
            <Text style={[styles.navIcon, index === 0 && styles.activeNav]}>{icon}</Text>
            <Text style={[styles.navLabel, index === 0 && styles.activeNav]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

type Product = {
  name: string;
  description: string;
  stock: number;
  price: string;
  active: boolean;
  tone: 'milk' | 'rice' | 'tea';
};

function Inventory({ onBack, onOpenOrders, onOpenMessages }: { onBack: () => void; onOpenOrders: () => void; onOpenMessages: () => void }) {
  const [tab, setTab] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  useEffect(() => {
    loadOwnerCollection('products', []).then(setProducts).finally(() => setProductsLoaded(true));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => { void loadOwnerCollection('products', []).then(setProducts); }, 3000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (productsLoaded) void saveOwnerCollection('products', products);
  }, [products, productsLoaded]);

  const visibleProducts = products.filter((product) => {
    const matchesTab = tab === 'All' || (tab === 'Active' ? product.active : !product.active);
    return matchesTab && `${product.name} ${product.description}`.toLowerCase().includes(search.toLowerCase());
  });

  const toggleProduct = async (name: string) => {
    const updatedProducts = products.map((product) => product.name === name ? { ...product, active: !product.active } : product);
    try {
      await saveOwnerCollection('products', updatedProducts);
      setProducts(updatedProducts);
    } catch {
      Alert.alert('Save failed', 'The product status could not be updated. Please try again.');
    }
  };

  const addProduct = async () => {
    const stock = Number(newStock);
    if (!newName.trim() || !newPrice.trim() || !Number.isFinite(stock) || stock < 0) {
      Alert.alert('Invalid product', 'Enter a product name, price and a valid stock quantity.');
      return;
    }
    if (products.some((product) => product.name.toLowerCase() === newName.trim().toLowerCase())) {
      Alert.alert('Duplicate product', 'A product with this name already exists.');
      return;
    }
    const product: Product = {
      name: newName.trim(),
      description: newName.trim(),
      stock,
      price: `Rs. ${newPrice.trim()}`,
      active: true,
      tone: 'tea',
    };
    const updatedProducts = [...products, product];
    try {
      await saveOwnerCollection('products', updatedProducts);
      setProducts(updatedProducts);
    } catch {
      Alert.alert('Save failed', 'The product could not be saved. Please try again.');
      return;
    }
    setNewName('');
    setNewPrice('');
    setNewStock('');
    setShowAddForm(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.inventoryHeader}>
        <Pressable onPress={onBack} style={styles.reportBack}><Text style={styles.reportBackText}>‹</Text></Pressable>
        <View style={styles.inventoryBrand}><Text style={styles.ownerLogo}>GL</Text><Text style={styles.inventoryTitle}>Inventory</Text></View>
        <View style={styles.ownerHeaderActions}><Text style={styles.bell}>♧</Text><View style={styles.avatar}><Text style={styles.avatarText}>OW</Text></View></View>
      </View>

      <View style={styles.inventorySummary}>
        <View><Text style={styles.inventorySummaryTitle}>Product Inventory</Text><Text style={styles.inventorySummarySub}>● {products.length} registered products</Text></View>
        <Pressable style={styles.addProduct} onPress={() => setShowAddForm((value) => !value)}><Text style={styles.addProductText}>{showAddForm ? '× Cancel' : '＋ Add product'}</Text></Pressable>
      </View>

      {showAddForm && <View style={styles.addProductForm}>
        <TextInput value={newName} onChangeText={setNewName} placeholder="Product name" style={styles.formInput} />
        <TextInput value={newPrice} onChangeText={setNewPrice} placeholder="Price (e.g. 850.00)" keyboardType="decimal-pad" style={styles.formInput} />
        <TextInput value={newStock} onChangeText={setNewStock} placeholder="Stock units" keyboardType="number-pad" style={styles.formInput} />
        <Pressable style={styles.formSubmit} onPress={addProduct}><Text style={styles.formSubmitText}>Add to inventory</Text></Pressable>
      </View>}

      <View style={styles.inventoryTabs}>
        {(['All', 'Active', 'Inactive'] as const).map((item) => (
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.inventoryTab, tab === item && styles.activeInventoryTab]}>
            <Text style={[styles.inventoryTabText, tab === item && styles.activeInventoryTabText]}>{item} ({item === 'All' ? products.length : item === 'Active' ? products.filter((product) => product.active).length : products.filter((product) => !product.active).length})</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inventorySearch}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search product by name or SKU..." placeholderTextColor="#7b897f" style={styles.searchInput} />
      </View>

      {visibleProducts.map((product) => (
        <View key={product.name} style={styles.productCard}>
          <View style={styles.productTop}>
            <View style={[styles.productImage, product.tone === 'rice' && styles.riceImage, product.tone === 'tea' && styles.teaImage]}><Text style={styles.productImageText}>{product.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Text></View>
            <View style={styles.productDetails}><Text style={styles.productName}>{product.name}</Text><Text style={styles.productDescription}>{product.description}</Text></View>
            <Pressable onPress={() => toggleProduct(product.name)} style={[styles.switch, product.active ? styles.switchOn : styles.switchOff]}><View style={styles.switchKnob} /></Pressable>
          </View>
          <View style={styles.stockPrice}>
            <View><Text style={styles.stockHeading}>AVAILABLE STOCK</Text><Text style={[styles.stockUnits, product.stock === 0 && styles.outOfStock]}>{product.stock} units</Text></View>
            <View><Text style={[styles.stockHeading, styles.priceHeading]}>PRICE</Text><Text style={[styles.priceValue, product.stock === 0 && styles.priceUnavailable]}>{product.price}</Text></View>
          </View>
          <View style={styles.productFooter}>
            <Text style={[styles.availability, product.stock === 0 && styles.unavailable]}>{product.stock > 0 ? '●  Available' : '●  Unavailable'}</Text>
            <View style={styles.productActions}><Text style={styles.editAction}>● Synced</Text></View>
          </View>
        </View>
      ))}

      {!products.length && <View style={styles.scanBanner}><View style={styles.scanIcon}><Text>▦</Text></View><View style={styles.scanDetails}><Text style={styles.scanTitle}>Inventory is empty</Text><Text style={styles.scanSubtitle}>Add a product to start tracking stock.</Text></View></View>}

      <View style={styles.bottomNav}>
        {[['⌂', 'Home'], ['🛒', 'Inventory'], ['▤', 'Orders'], ['□', 'Messages']].map(([icon, label], index) => (
          <Pressable key={label} style={styles.navItem} onPress={index === 0 ? onBack : index === 2 ? onOpenOrders : index === 3 ? onOpenMessages : undefined}>
            <Text style={[styles.navIcon, index === 1 && styles.activeNav]}>{icon}</Text><Text style={[styles.navLabel, index === 1 && styles.activeNav]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Notifications({ onBack, onOpenInventory, onOpenOrders, onOpenMessages }: { onBack: () => void; onOpenInventory: () => void; onOpenOrders: () => void; onOpenMessages: () => void }) {
  const [filter, setFilter] = useState('All');
  const [read, setRead] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const filters = ['All', 'Orders', 'Staff', 'Inventory', 'Reports'];

  useEffect(() => {
    const refresh = async () => {
      const [savedOrders, savedProducts] = await Promise.all([
        loadOwnerCollection<Order[]>('orders', []),
        loadOwnerCollection<Product[]>('products', []),
      ]);
      setOrders(savedOrders);
      setProducts(savedProducts);
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 3000);
    return () => clearInterval(timer);
  }, []);

  const pendingOrders = orders.filter((order) => !['Completed', 'Cancelled'].includes(order.status));
  const lowStockProducts = products.filter((product) => product.stock <= 10);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.notificationHeader}>
        <Pressable onPress={onBack} style={styles.reportBack}><Text style={styles.reportBackText}>‹</Text></Pressable>
        <View style={styles.notificationBrand}><Text style={styles.ownerLogo}>GL</Text><Text style={styles.notificationTitle}>Notifications</Text></View>
        <View style={styles.ownerHeaderActions}><Text style={styles.bell}>♧</Text><View style={styles.avatar}><Text style={styles.avatarText}>OW</Text></View></View>
      </View>

      <View style={styles.notificationSummary}>
        <Text style={styles.newCount}>{read ? '0 New' : `${pendingOrders.length + lowStockProducts.length} New`}</Text>
        <Text style={styles.realtime}>Real-time alerts</Text>
        <Pressable onPress={() => setRead(true)}><Text style={styles.markRead}>Mark all as read</Text></Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.notificationFilters}>
        {filters.map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.notificationFilter, filter === item && styles.activeNotificationFilter]}>
            <Text style={[styles.notificationFilterText, filter === item && styles.activeNotificationFilterText]}>{item}{item === 'All' && ' ●'}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {(filter === 'All' || filter === 'Orders') && pendingOrders.map((order) => (
        <NotificationCard key={order.id} category="Orders" icon="♧" title="Order awaiting fulfilment" time={order.date} detail={`${order.id} • ${order.customer}`} action={`${order.status}   View order →`} />
      ))}
      {(filter === 'All' || filter === 'Inventory') && lowStockProducts.map((product) => (
        <NotificationCard key={product.name} category="Inventory" icon="▤" title="LOW STOCK ALERT" time="Now" detail={`${product.name} has ${product.stock} units remaining.`} action="Needs reorder" warning />
      ))}
      {!pendingOrders.length && !lowStockProducts.length && <Text style={styles.panelSubtitle}>No active notifications</Text>}

      <View style={styles.bottomNav}>
        {[
          ['⌂', 'Home'], ['▣', 'Inventory'], ['▤', 'Orders'], ['▤', 'Messages'],
        ].map(([icon, label], index) => (
          <Pressable key={label} style={styles.navItem} onPress={index === 0 ? onBack : index === 1 ? onOpenInventory : index === 2 ? onOpenOrders : index === 3 ? onOpenMessages : undefined}>
            <Text style={[styles.navIcon, index === 3 && styles.activeNav]}>{icon}</Text>
            <Text style={[styles.navLabel, index === 3 && styles.activeNav]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function NotificationCard({ category, icon, title, time, detail, action, warning = false, success = false }: { category: string; icon: string; title: string; time: string; detail: string; action: string; warning?: boolean; success?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <View style={styles.notificationCard}>
      <View style={[styles.notificationIcon, warning && styles.notificationWarningIcon, success && styles.notificationSuccessIcon]}><Text style={styles.notificationIconText}>{icon}</Text></View>
      <View style={styles.notificationDetails}>
        <View style={styles.notificationTitleRow}><View style={styles.notificationNameRow}><View style={styles.unreadDot} /><Text style={styles.notificationCardTitle}>{title}</Text></View><Text style={styles.notificationTime}>{time}</Text></View>
        <Text style={styles.notificationDetail}>{detail}</Text>
        <Pressable onPress={() => setDismissed(true)}><Text style={[styles.notificationAction, warning && styles.notificationWarningText, success && styles.notificationSuccessText]}>{action}</Text></Pressable>
      </View>
    </View>
  );
}

function Settings({ onBack, onOpenInventory, onOpenOrders, onOpenMessages, onOpenCustomerProfile, onLogout }: { onBack: () => void; onOpenInventory: () => void; onOpenOrders: () => void; onOpenMessages: () => void; onOpenCustomerProfile: () => void; onLogout: () => void }) {
  const [saved, setSaved] = useState(false);
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [hotline, setHotline] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOwnerSettings()
      .then((settings) => {
        if (settings?.shopName) setShopName(settings.shopName);
        if (settings?.address) setAddress(settings.address);
        if (settings?.hotline) setHotline(settings.hotline);
      })
      .catch(() => Alert.alert('Settings unavailable', 'Saved settings could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.settingsHeader}>
        <Pressable onPress={onBack} style={styles.reportBack}><Text style={styles.reportBackText}>‹</Text></Pressable>
        <View style={styles.settingsBrand}><Text style={styles.ownerLogo}>GL</Text><Text style={styles.settingsTitle}>Settings</Text></View>
        <View style={styles.ownerHeaderActions}><Text style={styles.bell}>♧</Text><View style={styles.avatar}><Text style={styles.avatarText}>OW</Text></View></View>
      </View>

      <View style={styles.shopHero}>
        <Text style={styles.shopHeroIcon}>▥</Text>
        <View style={styles.shopHeroDetails}><Text style={styles.shopHeroName}>{shopName || 'Shop profile not configured'}</Text><Text style={styles.shopHeroSub}>{address || 'Add shop details below'}</Text></View>
        <Text style={styles.liveBadge}>{loading ? 'Loading' : 'Synced'}</Text>
      </View>

      <View style={styles.settingsPanel}>
        <View style={styles.settingsSectionTitle}><Text style={styles.sectionIcon}>▣</Text><Text style={styles.settingsPanelTitle}>Shop Profile</Text><Text style={styles.publicDetails}>Public Details</Text></View>
        <SettingField label="Shop Name" value={shopName} onChangeText={setShopName} icon="✎" />
        <SettingField label="Store Pickup Address" value={address} onChangeText={setAddress} icon="⌖" />
        <SettingField label="Contact Hotline" value={hotline} onChangeText={setHotline} icon="♧" />
      </View>

      <View style={styles.settingsPanel}>
        <View style={styles.settingsSectionTitle}><Text style={styles.sectionIcon}>◷</Text><Text style={styles.settingsPanelTitle}>Operating Hours</Text><Text style={styles.editSchedule}>Edit Schedule</Text></View>
        <Text style={styles.hoursNote}>Operating hours have not been configured.</Text>
      </View>

      <View style={styles.settingsPanel}>
        <View style={styles.settingsSectionTitle}><Text style={styles.sectionIcon}>♧</Text><Text style={styles.settingsPanelTitle}>Store Policies</Text><Text style={styles.publicDetails}>Customer Facing</Text></View>
        <Text style={styles.policyLabel}>Return Policy</Text>
        <Text style={styles.policyBox}>No return policy configured.</Text>
        <Text style={styles.policyNote}>Add store policies when the backend fields are available.</Text>
        <Text style={styles.policyLabel}>Pre-Order Holding Policy</Text>
        <Text style={styles.policyBox}>No pre-order holding policy configured.</Text>
        <Text style={styles.policyNote}>Add store policies when the backend fields are available.</Text>
      </View>

      <Pressable style={styles.saveButton} disabled={loading} onPress={async () => {
        try {
          await saveOwnerSettings({ shopName, address, hotline });
          setSaved(true);
          Alert.alert('Saved', 'Shop settings have been synced.');
        } catch {
          Alert.alert('Save failed', 'Could not sync settings. Check your Supabase connection.');
        }
      }}>
        <Text style={styles.saveButtonText}>{saved ? '✓ Changes Saved' : loading ? 'Loading Settings…' : '▣ Save Changes'}</Text>
      </Pressable>
      <Pressable style={styles.customerProfileLink} onPress={onOpenCustomerProfile}>
        <Text style={styles.customerProfileLinkText}>Open customer profile</Text>
      </Pressable>
      <Pressable style={styles.ownerLogoutButton} onPress={() => {
        Alert.alert('Log out', 'Are you sure you want to log out of the owner account?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log out', style: 'destructive', onPress: onLogout },
        ]);
      }}>
        <Text style={styles.ownerLogoutText}>Log out of owner account</Text>
      </Pressable>

      <View style={styles.bottomNav}>
        {[
          ['⌂', 'Home'], ['▣', 'Inventory'], ['▤', 'Orders'], ['▤', 'Messages'], ['⚙', 'Settings'],
        ].map(([icon, label], index) => (
          <Pressable key={label} style={styles.navItem} onPress={index === 0 ? onBack : index === 1 ? onOpenInventory : index === 2 ? onOpenOrders : index === 3 ? onOpenMessages : undefined}>
            <Text style={[styles.navIcon, index === 4 && styles.activeNav]}>{icon}</Text>
            <Text style={[styles.navLabel, index === 4 && styles.activeNav]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function CustomerChangePassword({ onBack }: { onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState('Customer');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileId, setProfileId] = useState('');

  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing details', 'Please complete all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'New password and confirmation must be the same.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters for your new password.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password changed', 'Your password has been updated successfully.');
    } catch (error) {
      Alert.alert('Could not change password', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete account', 'This action will sign you out and remove the local customer account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteCustomerAccount();
          Alert.alert('Account deleted', 'Your account has been removed.');
          onBack();
        } catch {
          Alert.alert('Delete failed', 'The account could not be deleted.');
        }
      } },
    ]);
  };

  return (
    <View style={styles.customerScreen}>
      <View style={styles.customerTopBar}>
        <Pressable onPress={onBack} accessibilityLabel="Go back"><Text style={styles.customerBack}>‹</Text></Pressable>
        <Text style={styles.customerTopTitle}>Change Password</Text>
        <Text style={styles.customerSettings}>⚙</Text>
      </View>
      <ScrollView contentContainerStyle={styles.customerContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.customerProfileHeading}>Manage Profile</Text>
        <TextInput value={profileName} onChangeText={setProfileName} placeholder="Full name" placeholderTextColor="#202124" style={styles.customerInput} />
        <TextInput value={profilePhone} onChangeText={setProfilePhone} placeholder="Phone number" placeholderTextColor="#202124" keyboardType="phone-pad" style={styles.customerInput} />
        <TextInput value={profileAddress} onChangeText={setProfileAddress} placeholder="Address" placeholderTextColor="#202124" style={styles.customerInput} />
        <TextInput value={profileId} onChangeText={setProfileId} placeholder="NIC / ID number" placeholderTextColor="#202124" style={styles.customerInput} />
        <Pressable style={styles.customerProfileSave} onPress={() => Alert.alert('Profile saved', 'Your customer profile has been updated.')}>
          <Text style={styles.customerProfileSaveText}>Save Profile</Text>
        </Pressable>
        <Text style={styles.customerHeading}>Change Your Password</Text>
        <TextInput value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor="#202124" secureTextEntry style={styles.customerInput} />
        <TextInput value={newPassword} onChangeText={setNewPassword} placeholder="New Password" placeholderTextColor="#202124" secureTextEntry style={styles.customerInput} />
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm Password" placeholderTextColor="#202124" secureTextEntry style={styles.customerInput} />
        <Pressable style={styles.customerChangeButton} onPress={submit} disabled={saving}>
          <Text style={styles.customerChangeButtonText}>{saving ? 'Updating…' : 'Change Password'}</Text>
        </Pressable>
        <Text style={styles.deletePrompt}>If You want to Delete Your Account</Text>
        <Pressable style={styles.deleteButton} onPress={confirmDelete}><Text style={styles.deleteButtonText}>Delete</Text></Pressable>
      </ScrollView>
      <View style={styles.customerBottomNav}>
        {['⌂', '●', '🛒', '▣', '●'].map((icon, index) => (
          <View key={`${icon}-${index}`} style={styles.customerNavItem}>
            <Text style={[styles.customerNavIcon, index === 4 && styles.customerActiveNav]}>{icon}</Text>
            <Text style={[styles.customerNavLabel, index === 4 && styles.customerActiveNav]}>{['Home', 'Search', 'Cart', 'Orders', 'Profile'][index]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CustomerLogin({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [name, setName] = useState('');
      const [phone, setPhone] = useState('');
      const [address, setAddress] = useState('');
      const [idNumber, setIdNumber] = useState('');
      const [registering, setRegistering] = useState(false);

      const submit = () => {
        if (!email.includes('@') || password.length < 8 || (registering && (!name.trim() || !phone.trim() || !address.trim() || !idNumber.trim()))) {
          Alert.alert('Invalid details', registering ? 'Complete name, email, phone, address, ID and use an 8-character password.' : 'Enter a valid email and an 8-character password.');
          return;
        }
        onLogin();
      };

      return (
        <ScrollView contentContainerStyle={styles.customerAuthContent} keyboardShouldPersistTaps="handled">
          <Pressable onPress={onBack}><Text style={styles.customerBack}>‹</Text></Pressable>
          <View style={styles.customerAuthLogo}><Text style={styles.customerAuthLogoText}>GM</Text></View>
          <Text style={styles.customerAuthTitle}>{registering ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.customerAuthSubtitle}>Shop smarter with Greenline Mart</Text>
          {registering && <TextInput value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor="#68756f" style={styles.customerAuthInput} />}
          <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#68756f" keyboardType="email-address" autoCapitalize="none" style={styles.customerAuthInput} />
          {registering && <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="#68756f" keyboardType="phone-pad" style={styles.customerAuthInput} />}
          {registering && <TextInput value={address} onChangeText={setAddress} placeholder="Delivery address" placeholderTextColor="#68756f" style={styles.customerAuthInput} />}
          {registering && <TextInput value={idNumber} onChangeText={setIdNumber} placeholder="NIC / ID number" placeholderTextColor="#68756f" style={styles.customerAuthInput} />}
          <TextInput value={password} onChangeText={setPassword} placeholder={registering ? 'Create password' : 'Password'} placeholderTextColor="#68756f" secureTextEntry style={styles.customerAuthInput} />
          <Pressable style={styles.customerAuthButton} onPress={submit}><Text style={styles.customerAuthButtonText}>{registering ? 'Create Account' : 'Log In'}</Text></Pressable>
          <Pressable onPress={() => setRegistering((value) => !value)}><Text style={styles.customerAuthSwitch}>{registering ? 'Already have an account? Log in' : 'New customer? Create an account'}</Text></Pressable>
        </ScrollView>
      );
}

function CustomerHome({ onProfile, onLogout }: { onProfile: () => void; onLogout: () => void }) {
      const defaultProducts: Product[] = [
        { name: 'Fresh Milk 1L', description: 'Organic whole pasture milk, chilled', stock: 42, price: 'Rs. 510.00', active: true, tone: 'milk' },
        { name: 'Basmati Rice 5kg', description: 'Premium long-grain aged rice sack', stock: 0, price: 'Rs. 1,250.00', active: false, tone: 'rice' },
        { name: 'Ceylon Tea 400g', description: 'Highland pure unbroken orange pekoe', stock: 56, price: 'Rs. 430.00', active: true, tone: 'tea' },
      ];
      const [products, setProducts] = useState<Product[]>(defaultProducts);
      const [cartCount, setCartCount] = useState(0);
      const [query, setQuery] = useState('');
      const [activeTab, setActiveTab] = useState<'Home' | 'Cart' | 'Orders' | 'Messages'>('Home');
      const [orderStatus, setOrderStatus] = useState<'Pending' | 'Accepted' | 'Rejected'>('Pending');
      const [hasOrder, setHasOrder] = useState(false);
      const [feedback, setFeedback] = useState('');
      const [feedbackProduct, setFeedbackProduct] = useState('');
      useEffect(() => {
        const refreshCustomerView = async () => {
          const savedProducts = await loadOwnerCollection('products', defaultProducts);
          setProducts(savedProducts.filter((product) => product.active));
          const orders = await loadOwnerCollection<Order[]>('orders', []);
          const customerOrder = orders.find((order) => order.id === '#ORD-CUSTOMER-001');
          if (customerOrder) {
            setHasOrder(true);
            setOrderStatus(customerOrder.status === 'Completed' ? 'Accepted' : customerOrder.status === 'Cancelled' ? 'Rejected' : customerOrder.status === 'Preparing' ? 'Accepted' : 'Pending');
          }
        };
        void refreshCustomerView();
        const timer = setInterval(() => { void refreshCustomerView(); }, 3000);
        return () => clearInterval(timer);
      }, []);
      const visibleProducts = products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));
      const placeOrder = async () => {
        if (!cartCount) {
          Alert.alert('Cart is empty', 'Add at least one product before ordering.');
          return;
        }
        const orders = await loadOwnerCollection<Order[]>('orders', []);
        const nextOrder: Order = {
          id: '#ORD-CUSTOMER-001',
          customer: 'Customer',
          items: `${cartCount} item(s)`,
          date: new Date().toISOString(),
          amount: 'Calculated at checkout',
          status: 'Awaiting',
          type: 'Pre-Order',
        };
        const existingIndex = orders.findIndex((order) => order.id === nextOrder.id);
        const updatedOrders = existingIndex >= 0
          ? orders.map((order, index) => index === existingIndex ? { ...order, ...nextOrder } : order)
          : [nextOrder, ...orders];
        await saveOwnerCollection('orders', updatedOrders);
        setHasOrder(true);
        setOrderStatus('Pending');
        setActiveTab('Orders');
        Alert.alert('Order placed', 'Your order is pending owner approval.');
      };
      const submitFeedback = () => {
        if (!feedbackProduct || !feedback.trim()) {
          Alert.alert('Feedback required', 'Choose a product and write your feedback.');
          return;
        }
        Alert.alert('Thank you', 'Your product feedback has been submitted.');
        setFeedback('');
        setFeedbackProduct('');
      };

      return (
        <View style={styles.customerShop}>
          <ScrollView contentContainerStyle={styles.customerShopContent}>
            <View style={styles.customerShopHeader}>
              <View><Text style={styles.customerShopGreeting}>Good morning, Customer</Text><Text style={styles.customerShopTitle}>What do you need today?</Text></View>
              <Pressable onPress={onProfile} style={styles.customerProfileCircle}><Text style={styles.customerProfileEmoji}>●</Text></Pressable>
            </View>
            <View style={styles.customerSearch}><Text style={styles.customerSearchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search products..." placeholderTextColor="#65746e" style={styles.customerSearchInput} /></View>
            {activeTab === 'Home' && <View style={styles.customerPromo}><Text style={styles.customerPromoTitle}>Fresh groceries, delivered your way</Text><Text style={styles.customerPromoText}>Order online and collect from Greenline Mart.</Text><Pressable onPress={() => setActiveTab('Cart')}><Text style={styles.customerPromoLink}>Start shopping →</Text></Pressable></View>}
            {activeTab === 'Cart' && <View style={styles.customerPagePanel}><Text style={styles.customerPageTitle}>Your Cart</Text><Text style={styles.customerPageText}>{cartCount ? `${cartCount} item(s) ready for checkout.` : 'Your cart is empty.'}</Text><Pressable style={styles.customerAuthButton} onPress={placeOrder}><Text style={styles.customerAuthButtonText}>Place Order</Text></Pressable></View>}
            {activeTab === 'Orders' && <View style={styles.customerPagePanel}><Text style={styles.customerPageTitle}>Order Status</Text><Text style={styles.customerOrderId}>#ORD-CUSTOMER-001</Text><View style={styles.customerStatusRow}><Text style={styles.customerStatusLabel}>Current status</Text><Text style={[styles.customerStatusValue, orderStatus === 'Accepted' && styles.customerAccepted, orderStatus === 'Rejected' && styles.customerRejected]}>{hasOrder ? orderStatus : 'No order yet'}</Text></View><Text style={styles.customerPageText}>Owner updates appear here automatically.</Text><Pressable style={styles.customerOutlineButton} onPress={() => setActiveTab('Messages')}><Text style={styles.customerOutlineText}>View messages</Text></Pressable></View>}
            {activeTab === 'Messages' && <View style={styles.customerPagePanel}><Text style={styles.customerPageTitle}>Messages</Text><Text style={styles.customerMessage}><Text style={styles.customerMessageFrom}>Greenline Mart Owner</Text>{'\n'}{hasOrder ? `Your order is currently ${orderStatus.toLowerCase()}.` : 'Place an order to receive owner updates here.'}</Text><TextInput value={feedbackProduct} onChangeText={setFeedbackProduct} placeholder="Product for feedback" placeholderTextColor="#65746e" style={styles.customerSmallInput} /><TextInput value={feedback} onChangeText={setFeedback} placeholder="Write product feedback..." placeholderTextColor="#65746e" style={[styles.customerSmallInput, { height: 70 }]} multiline /><Pressable style={styles.customerOutlineButton} onPress={submitFeedback}><Text style={styles.customerOutlineText}>Submit Feedback</Text></Pressable></View>}
            {activeTab === 'Home' && <View style={styles.customerSectionHeading}><Text style={styles.customerSectionTitle}>Popular products</Text><Text style={styles.customerViewAll}>View all</Text></View>}
            {activeTab === 'Home' && visibleProducts.map((product) => (
              <View key={product.name} style={styles.customerProductCard}>
                <View style={styles.customerProductImage}><Text style={styles.customerProductEmoji}>PR</Text></View>
                <View style={styles.customerProductDetails}><Text style={styles.customerProductName}>{product.name}</Text><Text style={styles.customerProductPrice}>{product.price}</Text><Text style={styles.customerAvailable}>● Available today</Text></View>
                <Pressable style={styles.customerAddButton} onPress={() => setCartCount((count) => count + 1)}><Text style={styles.customerAddText}>＋</Text></Pressable>
              </View>
            ))}
            {activeTab === 'Home' && <Pressable style={styles.customerOrdersBanner} onPress={() => setActiveTab('Orders')}>
              <Text style={styles.customerOrdersIcon}>▣</Text><View style={styles.customerOrdersDetails}><Text style={styles.customerOrdersTitle}>Track your orders</Text><Text style={styles.customerOrdersText}>View order status and pickup times</Text></View><Text style={styles.customerArrow}>›</Text>
            </Pressable>}
            <Pressable onPress={onLogout} style={styles.customerLogout}><Text style={styles.customerLogoutText}>Log out</Text></Pressable>
          </ScrollView>
          <View style={styles.customerBottomNav}>
            {['⌂', '●', '🛒', '▣', '●'].map((icon, index) => (
              <Pressable key={`${icon}-${index}`} style={styles.customerNavItem} onPress={() => index === 0 ? setActiveTab('Home') : index === 2 ? setActiveTab('Cart') : index === 3 ? setActiveTab('Orders') : index === 4 ? onProfile : index === 1 ? setActiveTab('Home') : undefined}><Text style={[styles.customerNavIcon, index === 2 && styles.customerCartIcon]}>{index === 2 ? `${icon}${cartCount ? ` ${cartCount}` : ''}` : icon}</Text><Text style={[styles.customerNavLabel, index === 0 && styles.customerActiveNav]}>{['Home', 'Search', 'Cart', 'Orders', 'Profile'][index]}</Text></Pressable>
            ))}
          </View>
        </View>
      );
}

function SupplierLogin({ onLogin, onBack }: { onLogin: (profile: SupplierProfile) => void; onBack: () => void }) {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('supplier@greenlinemart.lk');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [registrationImage, setRegistrationImage] = useState('');
  const [password, setPassword] = useState('supplier1234');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.includes('@') || password.length < 8 || (registering && (!phone.trim() || !address.trim() || !idNumber.trim() || !businessName.trim() || !registrationImage.trim()))) {
      setError(registering ? 'Complete every registration field and use an 8-character password.' : 'Enter a valid email and an 8-character password.');
      return;
    }
    try {
      if (registering) {
        const profile: SupplierProfile = { id: `SUP-${Date.now()}`, email: email.trim(), phone: phone.trim(), address: address.trim(), idNumber: idNumber.trim(), businessName: businessName.trim(), registrationImage: registrationImage.trim(), password, status: 'Pending', createdAt: new Date().toISOString() };
        await registerSupplier(profile);
        Alert.alert('Registration submitted', 'Your supplier account is pending owner approval.');
        setRegistering(false);
      } else {
        onLogin(await signInSupplier(email.trim(), password));
      }
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to continue.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.customerAuthContent} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack}><Text style={styles.customerBack}>‹</Text></Pressable>
      <View style={styles.customerAuthLogo}><Text style={styles.customerAuthLogoText}>SP</Text></View>
      <Text style={styles.customerAuthTitle}>{registering ? 'Become a supplier' : 'Supplier sign in'}</Text>
      <Text style={styles.customerAuthSubtitle}>Supply Greenline Mart with confidence</Text>
      {registering && <TextInput value={businessName} onChangeText={setBusinessName} placeholder="Business name" placeholderTextColor="#68756f" style={styles.customerAuthInput} />}
      <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor="#68756f" keyboardType="email-address" autoCapitalize="none" style={styles.customerAuthInput} />
      {registering && <><TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" placeholderTextColor="#68756f" keyboardType="phone-pad" style={styles.customerAuthInput} /><TextInput value={address} onChangeText={setAddress} placeholder="Business address" placeholderTextColor="#68756f" style={styles.customerAuthInput} /><TextInput value={idNumber} onChangeText={setIdNumber} placeholder="Supplier ID / registration number" placeholderTextColor="#68756f" style={styles.customerAuthInput} /><TextInput value={registrationImage} onChangeText={setRegistrationImage} placeholder="Registration image URI or file name" placeholderTextColor="#68756f" style={styles.customerAuthInput} /></>}
      <TextInput value={password} onChangeText={setPassword} placeholder={registering ? 'Create password' : 'Password'} placeholderTextColor="#68756f" secureTextEntry style={styles.customerAuthInput} />
      <Pressable style={styles.customerAuthButton} onPress={() => void submit()}><Text style={styles.customerAuthButtonText}>{registering ? 'Submit registration' : 'Sign in as Supplier'}</Text></Pressable>
      {error ? <Text style={styles.loginError}>{error}</Text> : null}
      <Pressable onPress={() => setRegistering((value) => !value)}><Text style={styles.customerAuthSwitch}>{registering ? 'Already registered? Sign in' : 'New supplier? Register here'}</Text></Pressable>
      {!registering && <View style={styles.ownerAccessNote}><Text style={styles.ownerAccessTitle}>Demo supplier account</Text><Text style={styles.ownerAccessText}>supplier@greenlinemart.lk / supplier1234</Text></View>}
    </ScrollView>
  );
}

function SupplierPortal({ profile, onLogout, onProfileUpdate }: { profile: SupplierProfile; onLogout: () => void; onProfileUpdate: (profile: SupplierProfile) => void }) {
  const [tab, setTab] = useState<'Home' | 'Items' | 'Orders' | 'History' | 'Messages' | 'Buy' | 'Profile'>('Home');
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [messages, setMessages] = useState<SupplierMessage[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  const [message, setMessage] = useState('');
  const [receivedDetails, setReceivedDetails] = useState<Record<string, string>>({});
  const [profilePhone, setProfilePhone] = useState(profile.phone);
  const [profileAddress, setProfileAddress] = useState(profile.address);
  const [profileBusinessName, setProfileBusinessName] = useState(profile.businessName);

  const refresh = async () => {
    const [savedProducts, savedOrders, savedMessages] = await Promise.all([
      loadOwnerCollection<SupplierProduct[]>('supplierProducts', []),
      loadOwnerCollection<SupplyOrder[]>('supplyOrders', []),
      loadOwnerCollection<SupplierMessage[]>('supplierMessages', []),
    ]);
    setProducts(savedProducts);
    setOrders(savedOrders);
    setMessages(savedMessages);
  };
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 3000); return () => clearInterval(timer); }, []);

  const resetForm = () => { setFormOpen(false); setEditing(null); setName(''); setImage(''); setPrice(''); setDescription(''); setStock(''); };
  const saveProduct = async () => {
    if (!name.trim() || !price.trim() || !description.trim() || Number.isNaN(Number(stock))) {
      Alert.alert('Missing item details', 'Enter item name, image URI, price, description and stock.');
      return;
    }
    const item: SupplierProduct = { id: editing || `SP-${Date.now()}`, supplierId: profile.id, supplierName: profile.businessName, name: name.trim(), image: image.trim(), price: price.trim().startsWith('Rs.') ? price.trim() : `Rs. ${price.trim()}`, description: description.trim(), stock: Number(stock), active: true, updatedAt: new Date().toISOString() };
    const next = editing ? products.map((product) => product.id === editing ? item : product) : [item, ...products];
    await saveOwnerCollection('supplierProducts', next);
    resetForm(); await refresh();
  };
  const deleteProduct = async (id: string) => { const next = products.filter((product) => product.id !== id); await saveOwnerCollection('supplierProducts', next); setProducts(next); };
  const updateOrder = async (order: SupplyOrder, status: SupplyOrder['status']) => {
    const next = orders.map((item) => item.id === order.id ? { ...item, ...order, status, date: new Date().toISOString() } : item);
    await saveOwnerCollection('supplyOrders', next); setOrders(next);
    const note: SupplierMessage = { id: `SM-${Date.now()}`, from: profile.businessName, to: order.buyer, body: `Supply order ${order.id} was ${status.toLowerCase()}.`, date: new Date().toISOString(), read: false };
    await saveOwnerCollection('supplierMessages', [note, ...messages]);
    Alert.alert('Supply order updated', `${order.id} is now ${status}.`);
  };
  const placeSupplyOrder = async (product: SupplierProduct) => {
    const order: SupplyOrder = { id: `SO-${Date.now()}`, supplierId: product.supplierId, supplierName: product.supplierName, buyer: profile.businessName, productId: product.id, productName: product.name, quantity: 1, amount: product.price, status: 'Pending', date: new Date().toISOString() };
    await saveOwnerCollection('supplyOrders', [order, ...orders]); await refresh(); Alert.alert('Order sent', 'The supplier will receive your supply order.');
  };
  const sendMessage = async () => {
    if (!message.trim()) return;
    const sent: SupplierMessage = { id: `SM-${Date.now()}`, from: profile.businessName, to: 'Greenline Mart staff', body: message.trim(), date: new Date().toISOString(), read: false };
    await saveOwnerCollection('supplierMessages', [sent, ...messages]);
    const ownerMessages = await loadOwnerCollection<Array<{ name: string; role: string; preview: string; time: string; unread: number; online: boolean }>>('messages', []);
    await saveOwnerCollection('messages', [{ name: profile.businessName, role: 'Supplier', preview: sent.body, time: new Date().toLocaleString(), unread: 1, online: true }, ...ownerMessages]);
    setMessage(''); await refresh();
  };
  const saveProfile = async () => {
    if (!profileBusinessName.trim() || !profilePhone.trim() || !profileAddress.trim()) {
      Alert.alert('Missing profile details', 'Business name, phone and address are required.');
      return;
    }
    const updated = { ...profile, businessName: profileBusinessName.trim(), phone: profilePhone.trim(), address: profileAddress.trim() };
    const profiles = await loadOwnerCollection<SupplierProfile[]>('supplierProfiles', []);
    await saveOwnerCollection('supplierProfiles', profiles.map((item) => item.id === profile.id ? updated : item));
    onProfileUpdate(updated);
    Alert.alert('Profile saved', 'Your supplier profile has been updated.');
  };
  const visibleProducts = products.filter((product) => `${product.name} ${product.description} ${product.supplierName}`.toLowerCase().includes(search.toLowerCase()));
  const incoming = orders.filter((order) => order.supplierId === profile.id && order.buyer !== profile.businessName && order.status === 'Pending');
  const history = orders.filter((order) => order.status === 'Accepted' || order.status === 'Rejected' || order.status === 'Received');
  const date = (value: string) => new Date(value).toLocaleString();

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.userHeader}><View style={styles.userBrand}><Text style={styles.ownerLogo}>SP</Text><Text style={styles.userTitle}>{profile.businessName}{'\n'}Supplier portal</Text></View><Pressable onPress={onLogout}><Text style={styles.addStaff}>Log out</Text></Pressable></View>
      <View style={styles.staffPortalTabs}>{(['Home', 'Items', 'Orders', 'History', 'Messages', 'Buy', 'Profile'] as const).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.staffPortalTab, tab === item && styles.activeStaffPortalTab]}><Text style={[styles.staffPortalTabText, tab === item && styles.activeStaffPortalTabText]}>{item}</Text></Pressable>)}</View>
      {(tab === 'Home' || tab === 'Profile') && <View style={styles.staffPanel}><Text style={styles.staffTitle}>{tab === 'Home' ? 'Supplier workspace' : 'Manage profile'}</Text><Text style={styles.panelSubtitle}>{profile.status} account • {profile.email}</Text>{tab === 'Profile' ? <><TextInput value={profileBusinessName} onChangeText={setProfileBusinessName} placeholder="Business name" style={styles.formInput} /><TextInput value={profilePhone} onChangeText={setProfilePhone} placeholder="Phone" style={styles.formInput} /><TextInput value={profileAddress} onChangeText={setProfileAddress} placeholder="Address" style={styles.formInput} /><Text style={styles.panelSubtitle}>Supplier ID: {profile.idNumber}</Text><Pressable style={styles.formSubmit} onPress={() => void saveProfile()}><Text style={styles.formSubmitText}>Save profile</Text></Pressable></> : <><Text style={styles.customerPageText}>Business: {profile.businessName}{'\n'}Phone: {profile.phone}{'\n'}Address: {profile.address}{'\n'}Supplier ID: {profile.idNumber}</Text><Text style={styles.customerPageText}>Manage your catalogue, respond to supply orders, message staff and track received stock from one place.</Text><Pressable style={styles.customerOutlineButton} onPress={() => setTab('Items')}><Text style={styles.customerOutlineText}>Manage items ({products.length})</Text></Pressable></>}</View>}
      {(tab === 'Items' || tab === 'Buy') && <View style={styles.staffPanel}><Text style={styles.staffTitle}>{tab === 'Items' ? 'My supplier items' : 'Search supplier products'}</Text><TextInput value={search} onChangeText={setSearch} placeholder="Search products or suppliers..." placeholderTextColor="#7b897f" style={styles.formInput} />{tab === 'Items' && <Pressable style={styles.formSubmit} onPress={() => { resetForm(); setFormOpen(true); }}><Text style={styles.formSubmitText}>＋ Add item</Text></Pressable>}{formOpen && <View style={styles.addProductForm}><TextInput value={name} onChangeText={setName} placeholder="Item name" style={styles.formInput} /><TextInput value={image} onChangeText={setImage} placeholder="Item image URI / file name (optional)" style={styles.formInput} /><TextInput value={price} onChangeText={setPrice} placeholder="Price" keyboardType="decimal-pad" style={styles.formInput} /><TextInput value={description} onChangeText={setDescription} placeholder="Short description" style={styles.formInput} /><TextInput value={stock} onChangeText={setStock} placeholder="Available stock" keyboardType="number-pad" style={styles.formInput} /><Pressable style={styles.formSubmit} onPress={() => void saveProduct()}><Text style={styles.formSubmitText}>{editing ? 'Update item' : 'Save item'}</Text></Pressable></View>}{visibleProducts.map((product) => <View key={product.id} style={styles.staffOrderCard}><Text style={styles.staffOrderTitle}>{product.name} • {product.price}</Text><Text style={styles.panelSubtitle}>{product.description} • {product.stock} in stock{product.image ? ` • ${product.image}` : ''}</Text>{tab === 'Items' && product.supplierId === profile.id && <View style={styles.staffActions}><Pressable onPress={() => { setEditing(product.id); setName(product.name); setImage(product.image); setPrice(product.price); setDescription(product.description); setStock(String(product.stock)); setFormOpen(true); }}><Text style={styles.staffEditAction}>Update</Text></Pressable><Pressable onPress={() => void deleteProduct(product.id)}><Text style={styles.staffDeleteAction}>Delete</Text></Pressable></View>}{tab === 'Buy' && <Pressable style={styles.customerOutlineButton} onPress={() => void placeSupplyOrder(product)}><Text style={styles.customerOutlineText}>Order this item</Text></Pressable>}</View>)}</View>}
      {tab === 'Orders' && <View style={styles.staffPanel}><Text style={styles.staffTitle}>Supply orders awaiting response</Text>{incoming.map((order) => <View key={order.id} style={styles.staffOrderCard}><Text style={styles.staffOrderTitle}>{order.productName} × {order.quantity}</Text><Text style={styles.panelSubtitle}>{order.id} • {order.buyer} • {date(order.date)}</Text><View style={styles.staffActions}><Pressable onPress={() => void updateOrder(order, 'Accepted')}><Text style={styles.staffEditAction}>Accept</Text></Pressable><Pressable onPress={() => void updateOrder(order, 'Rejected')}><Text style={styles.staffDeleteAction}>Reject</Text></Pressable></View></View>)}{!incoming.length && <Text style={styles.panelSubtitle}>No pending supply orders.</Text>}</View>}
      {tab === 'History' && <View style={styles.staffPanel}><Text style={styles.staffTitle}>Supply order history</Text>{history.map((order) => <View key={order.id} style={styles.staffOrderCard}><Text style={styles.staffOrderTitle}>{order.productName} • {order.status}</Text><Text style={styles.panelSubtitle}>{order.id} • {date(order.date)}</Text>{order.status === 'Accepted' && <><TextInput value={receivedDetails[order.id] || ''} onChangeText={(value) => setReceivedDetails((current) => ({ ...current, [order.id]: value }))} placeholder="Received stock details" style={styles.formInput} /><Pressable style={styles.customerOutlineButton} onPress={() => void updateOrder({ ...order, receivedDetails: receivedDetails[order.id], receivedStock: Number(receivedDetails[order.id]) || 0 }, 'Received')}><Text style={styles.customerOutlineText}>Update received stock</Text></Pressable></>}</View>)}</View>}
      {tab === 'Messages' && <View style={styles.staffPanel}><Text style={styles.staffTitle}>Messages with staff and suppliers</Text>{messages.filter((item) => item.from === profile.businessName || item.to === profile.businessName || item.to === 'Greenline Mart staff').map((item) => <View key={item.id} style={styles.messageCard}><View style={styles.messageDetails}><Text style={styles.messageName}>{item.from} → {item.to}</Text><Text style={styles.messagePreview}>{item.body}</Text><Text style={styles.messageTime}>{date(item.date)}</Text></View></View>)}<TextInput value={message} onChangeText={setMessage} placeholder="Write a message to staff..." style={styles.formInput} multiline /><Pressable style={styles.formSubmit} onPress={() => void sendMessage()}><Text style={styles.formSubmitText}>Send message with date/time</Text></Pressable></View>}
      <View style={styles.bottomNav}>{[['⌂', 'Home'], ['▣', 'Items'], ['▤', 'Orders'], ['□', 'Messages']].map(([icon, label], index) => <Pressable key={label} style={styles.navItem} onPress={() => setTab(index === 0 ? 'Home' : index === 1 ? 'Items' : index === 2 ? 'Orders' : 'Messages')}><Text style={[styles.navIcon, ((index === 0 && tab === 'Home') || (index === 1 && tab === 'Items') || (index === 2 && tab === 'Orders') || (index === 3 && tab === 'Messages')) && styles.activeNav]}>{icon}</Text><Text style={styles.navLabel}>{label}</Text></Pressable>)}</View>
    </ScrollView>
  );
}

function RoleSelection({ onOwner, onCustomer, onStaff, onSupplier }: { onOwner: () => void; onCustomer: () => void; onStaff: () => void; onSupplier: () => void }) {
      return (
        <View style={styles.roleScreen}>
          <View style={styles.roleLogo}><Text style={styles.roleLogoText}>GM</Text></View>
          <Text style={styles.roleBrand}>Greenline Mart</Text>
          <Text style={styles.roleTitle}>How would you like to continue?</Text>
          <Text style={styles.roleSubtitle}>Choose your account type to get started.</Text>
          <Pressable style={styles.roleCard} onPress={onOwner}><Text style={styles.roleIcon}>▣</Text><View style={styles.roleCardDetails}><Text style={styles.roleCardTitle}>Owner / Admin</Text><Text style={styles.roleCardText}>Manage your shop, staff, suppliers and reports.</Text></View><Text style={styles.roleArrow}>›</Text></Pressable>
          <Pressable style={styles.roleCard} onPress={onCustomer}><Text style={styles.roleIcon}>●</Text><View style={styles.roleCardDetails}><Text style={styles.roleCardTitle}>Customer</Text><Text style={styles.roleCardText}>Browse products, shop online and track orders.</Text></View><Text style={styles.roleArrow}>›</Text></Pressable>
          <Pressable style={styles.roleCard} onPress={onStaff}><Text style={styles.roleIcon}>▤</Text><View style={styles.roleCardDetails}><Text style={styles.roleCardTitle}>Customer Staff</Text><Text style={styles.roleCardText}>Manage customer orders, stock prices and messages.</Text></View><Text style={styles.roleArrow}>›</Text></Pressable>
          <Pressable style={styles.roleCard} onPress={onSupplier}><Text style={styles.roleIcon}>♧</Text><View style={styles.roleCardDetails}><Text style={styles.roleCardTitle}>Supplier</Text><Text style={styles.roleCardText}>Manage items, supply orders, stock and messages.</Text></View><Text style={styles.roleArrow}>›</Text></Pressable>
          <Text style={styles.roleFooter}>Secure Greenline Mart portal</Text>
        </View>
      );
}

function StaffLogin({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const [email, setEmail] = useState('staff@greenlinemart.lk');
  const [password, setPassword] = useState('staff1234');
  const submit = () => {
    if (!email.includes('@') || password.length < 8) {
      Alert.alert('Invalid details', 'Enter a valid staff email and an 8-character password.');
      return;
    }
    onLogin();
  };
  return (
    <ScrollView contentContainerStyle={styles.customerAuthContent} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack}><Text style={styles.customerBack}>‹</Text></Pressable>
      <View style={styles.customerAuthLogo}><Text style={styles.customerAuthLogoText}>GL</Text></View>
      <Text style={styles.customerAuthTitle}>Customer Staff sign in</Text>
      <Text style={styles.customerAuthSubtitle}>Manage customer orders and store updates</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Staff email" placeholderTextColor="#68756f" keyboardType="email-address" autoCapitalize="none" style={styles.customerAuthInput} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#68756f" secureTextEntry style={styles.customerAuthInput} />
      <Pressable style={styles.customerAuthButton} onPress={submit}><Text style={styles.customerAuthButtonText}>Sign in as Staff</Text></Pressable>
      <View style={styles.ownerAccessNote}><Text style={styles.ownerAccessTitle}>Demo staff account</Text><Text style={styles.ownerAccessText}>staff@greenlinemart.lk / staff1234</Text></View>
    </ScrollView>
  );
}


function SettingField({ label, value, onChangeText, icon }: { label: string; value: string; onChangeText: (value: string) => void; icon: string }) {
  return (
    <View style={styles.settingFieldWrap}>
      <Text style={styles.settingFieldLabel}>{label}</Text>
      <View style={styles.settingField}><TextInput value={value} onChangeText={onChangeText} style={styles.settingFieldValue} /><Text style={styles.settingFieldIcon}>{icon}</Text></View>
    </View>
  );
}

type StaffRecord = {
  id: string;
  initials: string;
  name: string;
  role: string;
  access: string;
};

function UserManagement({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'Pending' | 'Staff' | 'Suppliers'>('Pending');
  const [pending, setPending] = useState<Array<{ id?: string; initials: string; name: string; role: string; request: string; date: string; tone: string; supplierId?: string }>>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ initials: string; name: string; category: string; status: string }>>([]);
  const [supplierProfiles, setSupplierProfiles] = useState<SupplierProfile[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [staffAccess, setStaffAccess] = useState('');
  useEffect(() => {
    Promise.all([
      loadOwnerCollection('pendingRequests', []),
      loadOwnerCollection<StaffRecord[]>('staff', []),
      loadOwnerCollection('suppliers', []),
      loadOwnerCollection<SupplierProfile[]>('supplierProfiles', []),
    ]).then(([savedPending, savedStaff, savedSuppliers, savedSupplierProfiles]) => {
      setPending(savedPending);
      setStaff(savedStaff);
      setSuppliers(savedSuppliers);
      setSupplierProfiles(savedSupplierProfiles);
    }).finally(() => setUsersLoaded(true));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      void Promise.all([
        loadOwnerCollection('pendingRequests', []),
        loadOwnerCollection<StaffRecord[]>('staff', []),
        loadOwnerCollection('suppliers', []),
        loadOwnerCollection<SupplierProfile[]>('supplierProfiles', []),
      ]).then(([savedPending, savedStaff, savedSuppliers, savedSupplierProfiles]) => {
        setPending(savedPending);
        setStaff(savedStaff);
        setSuppliers(savedSuppliers);
        setSupplierProfiles(savedSupplierProfiles);
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (usersLoaded) {
      void saveOwnerCollection('pendingRequests', pending);
      void saveOwnerCollection('staff', staff);
      void saveOwnerCollection('suppliers', suppliers);
      void saveOwnerCollection('supplierProfiles', supplierProfiles);
    }
  }, [pending, staff, suppliers, supplierProfiles, usersLoaded]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const visibleSuppliers = suppliers.filter((supplier) =>
    `${supplier.name} ${supplier.category}`.toLowerCase().includes(supplierSearch.toLowerCase()),
  );
  const approveRequest = (request: (typeof pending)[number]) => {
    setPending((items) => items.filter((item) => item.name !== request.name));
    if (request.role === 'Vendor') {
      if (request.supplierId) {
        setSupplierProfiles((items) => items.map((profile) => profile.id === request.supplierId
          ? { ...profile, status: 'Verified' }
          : profile));
      }
      setSuppliers((items) => items.map((supplier) => supplier.name === request.name
        ? { ...supplier, status: 'Verified' }
        : supplier));
      Alert.alert('Supplier approved', `${request.name} is now an approved supplier.`);
    } else {
      const newStaff: StaffRecord = {
        id: `${Date.now()}-${request.name}`,
        initials: request.initials,
        name: request.name,
        role: request.request,
        access: request.request,
      };
      setStaff((items) => [...items, newStaff]);
      Alert.alert('Staff approved', `${request.name} has been granted ${request.request}.`);
    }
  };
  const resetStaffForm = () => {
    setShowStaffForm(false);
    setEditingStaffId(null);
    setStaffName('');
    setStaffRole('');
    setStaffAccess('');
  };
  const openStaffForm = (member?: StaffRecord) => {
    if (member) {
      setEditingStaffId(member.id);
      setStaffName(member.name);
      setStaffRole(member.role);
      setStaffAccess(member.access);
    } else {
      setEditingStaffId(null);
      setStaffName('');
      setStaffRole('');
      setStaffAccess('');
    }
    setShowStaffForm(true);
  };
  const saveStaff = () => {
    const name = staffName.trim();
    const role = staffRole.trim();
    const access = staffAccess.trim();
    if (!name || !role || !access) {
      Alert.alert('Missing details', 'Enter the staff name, role and access level.');
      return;
    }
    const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    if (editingStaffId) {
      setStaff((items) => items.map((member) => member.id === editingStaffId ? { ...member, initials, name, role, access } : member));
      Alert.alert('Staff updated', `${name}'s details were updated.`);
    } else {
      setStaff((items) => [...items, { id: `${Date.now()}-${name}`, initials, name, role, access }]);
      Alert.alert('Staff added', `${name} was added to active staff.`);
    }
    resetStaffForm();
  };
  const deleteStaff = (member: StaffRecord) => {
    Alert.alert('Delete staff', `Remove ${member.name} from active staff?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setStaff((items) => items.filter((item) => item.id !== member.id));
        Alert.alert('Staff deleted', `${member.name} was removed.`);
      } },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.userHeader}>
        <Pressable onPress={onBack} style={styles.reportBack}><Text style={styles.reportBackText}>‹</Text></Pressable>
        <View style={styles.userBrand}>
          <Text style={styles.ownerLogo}>GL</Text>
          <Text style={styles.userTitle}>User / Staff{'\n'}Management</Text>
        </View>
        <View style={styles.ownerHeaderActions}>
          <Text style={styles.bell}>♧</Text>
          <View style={styles.avatar}><Text style={styles.avatarText}>OW</Text></View>
        </View>
      </View>

      <View style={styles.userTabs}>
        {(['Pending', 'Staff', 'Suppliers'] as const).map((tab) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.userTabButton, activeTab === tab && styles.activeUserTab]}>
            <Text style={[styles.userTabText, activeTab === tab && styles.activeUserTabText]}>{tab}{tab === 'Pending' ? `  ${pending.length}` : ''}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'Pending' && <View style={styles.actionHeading}>
        <View style={styles.actionTitleRow}><Text style={styles.actionTitle}>Action Required</Text><Text style={styles.newBadge}>New</Text></View>
        <Text style={styles.reviewCount}>{pending.length} review items</Text>
      </View>}

      {activeTab === 'Pending' && pending.map((request) => (
        <View key={request.name} style={styles.requestCard}>
          <View style={styles.requestTop}>
            <View style={[styles.requestAvatar, request.tone === 'orange' && styles.orangeAvatar]}><Text style={styles.requestInitials}>{request.initials}</Text></View>
            <View style={styles.requestDetails}>
              <Text style={styles.requestName}>{request.name}</Text>
              <Text style={styles.requestText}>Requesting: {request.request}</Text>
              <Text style={styles.requestDate}>◷  {request.date}</Text>
            </View>
            <Text style={[styles.roleBadge, request.tone === 'orange' && styles.vendorBadge]}>{request.role}</Text>
          </View>
          <View style={styles.requestActions}>
            <Pressable style={styles.approveButton} onPress={() => approveRequest(request)}>
              <Text style={styles.approveText}>✓ Approve</Text>
            </Pressable>
            <Pressable style={styles.rejectButton} onPress={() => {
              setPending((items) => items.filter((item) => item.name !== request.name));
              if (request.role === 'Vendor' && request.supplierId) {
                setSupplierProfiles((items) => items.map((profile) => profile.id === request.supplierId
                  ? { ...profile, status: 'Rejected' }
                  : profile));
                setSuppliers((items) => items.map((supplier) => supplier.name === request.name
                  ? { ...supplier, status: 'Rejected' }
                  : supplier));
              }
              Alert.alert('Request rejected', `${request.name}'s request was rejected.`);
            }}>
              <Text style={styles.rejectText}>× Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {activeTab === 'Staff' && <View style={styles.staffPanel}>
        <View style={styles.staffHeading}>
          <View style={styles.staffTitleRow}><Text style={styles.staffTitle}>Active Staff</Text><Text style={styles.teamBadge}>{staff.length} records</Text></View>
          <Pressable onPress={() => showStaffForm ? resetStaffForm() : openStaffForm()}><Text style={styles.addStaff}>{showStaffForm ? '× Cancel' : '⊕ Add staff'}</Text></Pressable>
        </View>
        {showStaffForm && <View style={styles.staffForm}>
          <TextInput value={staffName} onChangeText={setStaffName} placeholder="Full name" placeholderTextColor="#7b897f" style={styles.formInput} />
          <TextInput value={staffRole} onChangeText={setStaffRole} placeholder="Role (e.g. Cashier)" placeholderTextColor="#7b897f" style={styles.formInput} />
          <TextInput value={staffAccess} onChangeText={setStaffAccess} placeholder="Access (e.g. Sales & orders)" placeholderTextColor="#7b897f" style={styles.formInput} />
          <Pressable style={styles.formSubmit} onPress={saveStaff}><Text style={styles.formSubmitText}>{editingStaffId ? 'Save changes' : 'Add staff member'}</Text></Pressable>
        </View>}
        {staff.map((member) => (
          <View key={member.id} style={styles.staffMember}>
            <View style={styles.staffAvatar}><Text style={styles.staffInitials}>{member.initials}</Text></View>
            <View style={styles.staffDetails}><Text style={styles.staffName}>{member.name}</Text><Text style={styles.staffRole}>{member.role} <Text style={styles.staffBullet}>•</Text> <Text style={styles.staffAccess}>{member.access}</Text></Text></View>
            <View style={styles.staffActions}>
              <Pressable onPress={() => openStaffForm(member)}><Text style={styles.staffEditAction}>Edit</Text></Pressable>
              <Pressable onPress={() => deleteStaff(member)}><Text style={styles.staffDeleteAction}>Delete</Text></Pressable>
            </View>
          </View>
        ))}
        {!staff.length && !showStaffForm && <Text style={styles.panelSubtitle}>No staff records available. Add your first staff member.</Text>}
      </View>}

      {activeTab === 'Suppliers' && <View style={styles.staffPanel}>
        <View style={styles.staffHeading}>
          <View style={styles.staffTitleRow}><Text style={styles.staffTitle}>Approved Suppliers</Text><Text style={styles.teamBadge}>{suppliers.length} total</Text></View>
          <Pressable onPress={() => Alert.alert('Supplier registration', 'Share the supplier registration link to invite a new supplier.') }><Text style={styles.addStaff}>⊕ Invite</Text></Pressable>
        </View>
        <View style={styles.inventorySearch}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput value={supplierSearch} onChangeText={setSupplierSearch} placeholder="Search suppliers..." placeholderTextColor="#7b897f" style={styles.searchInput} />
        </View>
        {visibleSuppliers.map((supplier) => (
          <View key={supplier.name} style={styles.staffMember}>
            <View style={styles.staffAvatar}><Text style={styles.staffInitials}>{supplier.initials}</Text></View>
            <View style={styles.staffDetails}><Text style={styles.staffName}>{supplier.name}</Text><Text style={styles.staffRole}>{supplier.category}</Text></View>
            <Pressable onPress={() => Alert.alert('Supplier details', `${supplier.name}\nStatus: ${supplier.status}`)}><Text style={styles.activeBadge}>● {supplier.status}</Text></Pressable>
          </View>
        ))}
      </View>}

      {activeTab === 'Staff' && <Pressable style={styles.rolePermissions} onPress={() => Alert.alert('Role permissions', 'Manage access for Manager, Cashier, Stock Clerk and Curbside Dispatcher roles.')}>
        <Text style={styles.permissionIcon}>▣</Text>
        <View style={styles.permissionDetails}><Text style={styles.permissionTitle}>Role Permissions</Text><Text style={styles.permissionSubtitle}>Manage role limits & access tokens</Text></View>
        <Text style={styles.permissionArrow}>›</Text>
      </Pressable>}

      <View style={styles.bottomNav}>
        {[
          ['⌂', 'Home'], ['▣', 'Stock'], ['▤', 'Orders'], ['♟', 'Users'], ['▤', 'Inbox'],
        ].map(([icon, label], index) => (
          <Pressable key={label} style={styles.navItem} onPress={index === 0 ? onBack : undefined}>
            <Text style={[styles.navIcon, index === 3 && styles.activeNav]}>{icon}</Text>
            <Text style={[styles.navLabel, index === 3 && styles.activeNav]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function StaffMember({ initials, name, role, access, muted = false, orange = false }: { initials: string; name: string; role: string; access: string; muted?: boolean; orange?: boolean }) {
  return (
    <View style={styles.staffMember}>
      <View style={[styles.staffAvatar, muted && styles.mutedAvatar, orange && styles.orangeAvatar]}><Text style={styles.staffInitials}>{initials}</Text></View>
      <View style={styles.staffDetails}><Text style={styles.staffName}>{name}</Text><Text style={styles.staffRole}>{role} <Text style={styles.staffBullet}>•</Text> <Text style={styles.staffAccess}>{access}</Text></Text></View>
      <Text style={styles.activeBadge}>● Active</Text>
    </View>
  );
}

function Reports({ onBack, onOpenSupplierProgress, onOpenInventory, onOpenMessages }: { onBack: () => void; onOpenSupplierProgress: () => void; onOpenInventory: () => void; onOpenMessages: () => void }) {
  const [reportType, setReportType] = useState('Weekly Summary');
  const [generated, setGenerated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const refresh = () => { void loadOwnerCollection<Order[]>('orders', []).then(setOrders); };
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  const completedOrders = orders.filter((order) => order.status === 'Completed');
  const revenue = completedOrders.reduce((total, order) => total + (Number(order.amount.replace(/[^0-9.-]/g, '')) || 0), 0);
  const averageOrder = completedOrders.length ? revenue / completedOrders.length : 0;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.reportHeader}>
        <Pressable onPress={onBack} style={styles.reportBack}>
          <Text style={styles.reportBackText}>‹</Text>
        </Pressable>
        <View style={styles.reportBrand}>
          <Text style={styles.ownerLogo}>GL</Text>
          <Text style={styles.reportTitle}>Reports</Text>
        </View>
        <View style={styles.ownerHeaderActions}>
          <Text style={styles.bell}>♧</Text>
          <View style={styles.avatar}><Text style={styles.avatarText}>OW</Text></View>
        </View>
      </View>

      <View style={styles.reportTabs}>
        <View style={styles.activeReportTab}><Text style={styles.activeReportTabText}>▥ Sales</Text></View>
        <Pressable onPress={onOpenSupplierProgress}><Text style={styles.inactiveReportTab}>▰ Supplier Progress</Text></Pressable>
      </View>

      <View style={styles.reportStats}>
        <ReportStat label="Revenue" value={`Rs. ${revenue.toLocaleString('en-LK')}`} note={`${completedOrders.length} completed`} icon="↗" />
        <ReportStat label="Orders" value={String(orders.length)} note="All recorded orders" icon="◴" />
        <ReportStat label="Avg Order" value={`Rs. ${Math.round(averageOrder).toLocaleString('en-LK')}`} note="Completed orders" icon="♧" warning />
      </View>

      <View style={styles.reportPanel}>
        <View style={styles.reportPanelHeading}>
          <View>
            <Text style={styles.reportPanelTitle}>This Month</Text>
            <Text style={styles.reportPanelSubtitle}>Weekly revenue distribution (Rs.)</Text>
          </View>
          <View style={styles.livePill}><Text style={styles.livePillText}>● Live Sync</Text></View>
        </View>
        <View style={styles.barChart}><Text style={styles.panelSubtitle}>{orders.length ? `${completedOrders.length} completed orders generated Rs. ${revenue.toLocaleString('en-LK')}.` : 'No order data available yet.'}</Text></View>
      </View>

      <View style={styles.reportPanel}>
        <Text style={styles.generateTitle}>▤ Generate Report</Text>
        <View style={styles.formHeading}><Text style={styles.formLabel}>Date Range</Text><Text style={styles.setCurrent}>Set Current</Text></View>
        <View style={styles.formField}><Text style={styles.formIcon}>▣</Text><Text style={styles.formValue}>Current available order history</Text></View>
        <Text style={styles.formLabel}>Report Type</Text>
        <Pressable style={styles.formField} onPress={() => setReportType(reportType === 'Weekly Summary' ? 'Monthly Summary' : 'Weekly Summary')}>
          <Text style={styles.formIcon}>≡</Text><Text style={styles.formValue}>{reportType}⌄</Text><Text style={styles.formChevron}>⌃⌄</Text>
        </Pressable>
        <Pressable style={styles.generateButton} onPress={() => { setGenerated(true); Alert.alert('Report ready', `${reportType} has been generated and is ready to export.`); }}>
          <Text style={styles.generateButtonText}>{generated ? '✓  Report Generated' : '⇩  Generate Report'}</Text>
        </Pressable>
      </View>

      <View style={styles.reportPanel}>
        <View style={styles.recentHeading}><Text style={styles.recentTitle}>Recent Orders</Text><Text style={styles.today}>{orders.length}</Text></View>
        {orders.slice(0, 3).map((order) => <Fulfillment key={order.id} name={order.customer} detail={`${order.id} • ${order.items}`} status={order.status} route={order.status === 'Preparing'} />)}
        {!orders.length && <Text style={styles.panelSubtitle}>No orders available yet.</Text>}
      </View>

      <View style={styles.bottomNav}>
        {[
          ['⌂', 'Home'], ['▣', 'Inventory'], ['✓', 'Reports'], ['▤', 'Messages'],
        ].map(([icon, label], index) => (
          <Pressable key={label} style={styles.navItem} onPress={index === 0 ? onBack : index === 1 ? onOpenInventory : index === 3 ? onOpenMessages : undefined}>
            <Text style={[styles.navIcon, index === 2 && styles.activeNav]}>{icon}</Text>
            <Text style={[styles.navLabel, index === 2 && styles.activeNav]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function SupplierProgress({ onBack, onOpenInventory, onOpenOrders, onOpenMessages }: { onBack: () => void; onOpenInventory: () => void; onOpenOrders: () => void; onOpenMessages: () => void }) {
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [suppliers, setSuppliers] = useState<Array<{ initials: string; name: string; category: string; status: string }>>([]);
  useEffect(() => {
    const refresh = () => { void loadOwnerCollection('suppliers', []).then(setSuppliers); };
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.supplierHeader}>
        <Pressable onPress={onBack} style={styles.reportBack}><Text style={styles.reportBackText}>‹</Text></Pressable>
        <View style={styles.supplierBrand}><Text style={styles.ownerLogo}>GL</Text><Text style={styles.supplierTitle}>Supplier Progress</Text></View>
        <View style={styles.ownerHeaderActions}><Text style={styles.bell}>♧</Text><View style={styles.avatar}><Text style={styles.avatarText}>OW</Text></View></View>
      </View>

      <View style={styles.supplierSync}><View style={styles.syncDot} /><Text style={styles.supplierSyncText}>Supplier Logistics & Inbound</Text><Text style={styles.liveBadge}>Live Sync</Text></View>

      <View style={styles.supplierStats}>
        <View style={styles.supplierStat}><View style={styles.supplierStatTop}><Text style={styles.supplierStatLabel}>Registered Suppliers</Text><Text style={styles.supplierStatIcon}>♧</Text></View><Text style={styles.supplierStatValue}>{suppliers.length}</Text><Text style={styles.supplierStatNote}>From synced records</Text></View>
        <View style={styles.supplierStat}><View style={styles.supplierStatTop}><Text style={styles.supplierStatLabel}>Verified</Text><Text style={[styles.supplierStatIcon, styles.greenIcon]}>▰</Text></View><Text style={styles.supplierStatValue}>{suppliers.filter((supplier) => supplier.status === 'Verified').length}</Text><Text style={styles.supplierStatNote}>Supplier status</Text></View>
      </View>

      <View style={styles.supplierPanel}>
        <View style={styles.supplierPanelHeading}><View style={styles.supplierHeadingLeft}><View style={styles.headingAccent} /><Text style={styles.supplierPanelTitle}>Supplier Progress</Text></View><Pressable onPress={() => setSupplierFilter(supplierFilter === 'All' ? 'Needs attention' : 'All')}><Text style={styles.filterText}>{supplierFilter}⌄</Text></Pressable></View>
        {suppliers.filter((supplier) => supplierFilter === 'All' || supplier.status !== 'Verified').map((supplier) => <SupplierRow key={supplier.name} name={supplier.name} detail={supplier.category} score={supplier.status} progress={supplier.status === 'Verified' ? 1 : 0} />)}
        {!suppliers.length && <Text style={styles.panelSubtitle}>No supplier records available.</Text>}
        <Text style={styles.viewSuppliers}>View all {suppliers.length} registered suppliers →</Text>
      </View>

      <View style={styles.supplierPanel}>
        <Text style={styles.performanceTitle}>Overall Performance</Text>
        <Text style={styles.performanceSubtitle}>Current billing cycle • This Month</Text>
        <View style={styles.performanceContent}>
          <View style={styles.healthRing}><Text style={styles.healthValue}>{suppliers.length ? Math.round((suppliers.filter((supplier) => supplier.status === 'Verified').length / suppliers.length) * 100) : 0}%</Text><Text style={styles.healthLabel}>VERIFIED</Text></View>
          <View style={styles.performanceLegend}>
            <View style={styles.legendCard}><View style={styles.greenSquare} /><View><Text style={styles.legendTitle}>Verified Suppliers</Text><Text style={styles.legendDetail}>{suppliers.filter((supplier) => supplier.status === 'Verified').length} records</Text></View></View>
            <View style={styles.legendCard}><View style={styles.graySquare} /><View><Text style={styles.legendTitle}>Needs Review</Text><Text style={styles.legendDetail}>{suppliers.filter((supplier) => supplier.status !== 'Verified').length} records</Text></View></View>
          </View>
        </View>
        <View style={styles.reliability}><Text style={styles.reliabilityIcon}>♧</Text><Text style={styles.reliabilityText}>Supplier data source: <Text style={styles.reliabilityGreen}>Live collection</Text></Text><Text style={styles.reliabilityArrow}>›</Text></View>
      </View>

      <View style={styles.nextInbound}><Text style={styles.inboundIcon}>▦</Text><View style={styles.inboundDetails}><Text style={styles.inboundTitle}>Inbound schedule</Text><Text style={styles.inboundText}>No inbound shipment records available.</Text></View></View>

      <View style={styles.bottomNav}>
        {[['⌂', 'Home'], ['▣', 'Inventory'], ['▤', 'Orders'], ['□', 'Messages']].map(([icon, label], index) => (
          <Pressable key={label} style={styles.navItem} onPress={index === 0 ? onBack : index === 1 ? onOpenInventory : index === 2 ? onOpenOrders : index === 3 ? onOpenMessages : undefined}>
            <Text style={[styles.navIcon, index === 2 && styles.activeNav]}>{icon}</Text><Text style={[styles.navLabel, index === 2 && styles.activeNav]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Messages({ onBack, onOpenInventory, onOpenOrders }: { onBack: () => void; onOpenInventory: () => void; onOpenOrders: () => void }) {
  const [filter, setFilter] = useState('All Staff');
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');
  const [recipient, setRecipient] = useState('All staff');
  const [isComposing, setIsComposing] = useState(false);
  const [messages, setMessages] = useState<Array<{ name: string; role: string; preview: string; time: string; unread: number; online: boolean }>>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  useEffect(() => {
    loadOwnerCollection('messages', []).then(setMessages).finally(() => setMessagesLoaded(true));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => { void loadOwnerCollection('messages', []).then(setMessages); }, 3000);
    return () => clearInterval(timer);
  }, []);
  const filteredMessages = messages.filter((message) => {
    const textMatches = `${message.name} ${message.role} ${message.preview}`.toLowerCase().includes(search.toLowerCase());
    const roleMatches = filter === 'All Staff' || (filter === 'Managers' ? message.role === 'Manager' : filter === 'Cashiers' ? message.role === 'Cashier' : message.role === 'Curbside & Intake' && ['Curbside', 'Intake'].includes(message.role));
    return textMatches && roleMatches;
  });

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.messagesHeader}>
        <Pressable onPress={onBack} style={styles.reportBack}><Text style={styles.reportBackText}>‹</Text></Pressable>
        <View style={styles.messagesBrand}><Text style={styles.ownerLogo}>GL</Text><Text style={styles.messagesTitle}>Messages</Text></View>
        <View style={styles.ownerHeaderActions}><Text style={styles.bell}>♧</Text><View style={styles.avatar}><Text style={styles.avatarText}>OW</Text></View></View>
      </View>
      <View style={styles.commsRow}><Text style={styles.commsStatus}>● Store Comms</Text><Text style={styles.onlineBadge}>{messages.filter((message) => message.online).length} Online</Text><Pressable onPress={() => { setRecipient('All staff'); setIsComposing(true); }}><Text style={styles.broadcast}>♧ Broadcast</Text></Pressable></View>
      <View style={styles.messageSearch}><Text style={styles.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Search staff or role..." placeholderTextColor="#7b897f" style={styles.searchInput} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.messageFilters}>
        {['All Staff', 'Cashiers', 'Curbside & Intake', 'Managers'].map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.messageFilter, filter === item && styles.activeMessageFilter]}><Text style={[styles.messageFilterText, filter === item && styles.activeMessageFilterText]}>{item}</Text></Pressable>)}
      </ScrollView>
      {filteredMessages.map((message) => (
        <Pressable key={message.name} style={styles.messageCard} onPress={() => { setRecipient(message.name); setIsComposing(true); }}>
          <View style={styles.messageAvatar}><Text style={styles.messageAvatarText}>{message.name.split(' ').map((part) => part[0]).join('')}</Text><View style={[styles.presenceDot, !message.online && styles.offlineDot]} /></View>
          <View style={styles.messageDetails}><View style={styles.messageTitleRow}><Text style={styles.messageName}>{message.name}</Text><Text style={styles.messageRole}>{message.role}</Text><Text style={[styles.messageTime, message.unread > 0 && styles.unreadTime]}>{message.time}</Text></View><Text style={styles.messagePreview}>{message.preview}</Text></View>
          {message.unread > 0 ? <Text style={styles.unreadCount}>{message.unread}</Text> : <Text style={styles.readCheck}>✓</Text>}
        </Pressable>
      ))}
      {!filteredMessages.length && <Text style={styles.panelSubtitle}>No messages available.</Text>}
      {isComposing && <View style={styles.messageComposer}>
        <Text style={styles.composerTitle}>Message {recipient}</Text>
        <TextInput value={messageText} onChangeText={setMessageText} placeholder="Write a message..." placeholderTextColor="#7b897f" style={styles.composerInput} multiline />
        <View style={styles.composerActions}>
          <Pressable onPress={() => setIsComposing(false)}><Text style={styles.cancelComposer}>Cancel</Text></Pressable>
          <Pressable style={styles.sendMessageButton} onPress={() => {
            if (!messageText.trim()) {
              Alert.alert('Message required', 'Write a message before sending.');
              return;
            }
            const sentMessage = {
              name: recipient,
              role: recipient === 'All staff' ? 'Broadcast' : 'Staff',
              preview: messageText.trim(),
              time: 'Just now',
              unread: 0,
              online: true,
            };
            setMessages((items) => [sentMessage, ...items]);
            Alert.alert('Message sent', `Your message was sent to ${recipient}.`);
            setMessageText('');
            setIsComposing(false);
            void saveOwnerCollection('messages', [sentMessage, ...messages]);
          }}><Text style={styles.sendMessageText}>Send</Text></Pressable>
        </View>
      </View>}
      <Pressable style={styles.composeButton} onPress={() => { setRecipient('All staff'); setIsComposing(true); }}><Text style={styles.composeIcon}>▤</Text></Pressable>
      <View style={styles.bottomNav}>{[['⌂', 'Home'], ['🛒', 'Inventory'], ['▤', 'Orders'], ['□', 'Messages']].map(([icon, label], index) => <Pressable key={label} style={styles.navItem} onPress={index === 0 ? onBack : index === 1 ? onOpenInventory : index === 2 ? onOpenOrders : undefined}><Text style={[styles.navIcon, index === 3 && styles.activeNav]}>{icon}</Text><Text style={[styles.navLabel, index === 3 && styles.activeNav]}>{label}</Text></Pressable>)}</View>
    </ScrollView>
  );
}

function SupplierRow({ name, detail, score, progress }: { name: string; detail: string; score: string; progress: number }) {
  return (
    <View style={styles.supplierRow}><View style={styles.supplierLogo}><Text>▦</Text></View><View style={styles.supplierRowDetails}><Text style={styles.supplierName}>{name}  ◉</Text><Text style={styles.supplierDetail}>{detail}</Text><View style={styles.supplierProgressTrack}><View style={[styles.supplierProgressFill, { width: `${progress * 100}%` }]} /></View></View><View style={styles.supplierScore}><Text style={styles.scoreText}>{score}</Text><Text style={styles.onTime}>● On Time</Text></View></View>
  );
}

function ReportStat({ label, value, note, icon, warning = false }: { label: string; value: string; note: string; icon: string; warning?: boolean }) {
  return <View style={styles.reportStat}><View style={styles.reportStatTop}><Text style={styles.reportStatLabel}>{label}</Text><Text style={[styles.reportStatIcon, warning && styles.warningNote]}>{icon}</Text></View><Text style={styles.reportStatValue}>{value}</Text><Text style={[styles.reportStatNote, warning && styles.warningNote]}>{note}</Text></View>;
}

function Fulfillment({ name, detail, status, route = false }: { name: string; detail: string; status: string; route?: boolean }) {
  return <View style={styles.fulfillment}><View style={[styles.fulfillmentIcon, route && styles.routeIcon]}><Text>{route ? '◒' : '♧'}</Text></View><View style={styles.fulfillmentDetails}><Text style={styles.fulfillmentName}>{name}</Text><Text style={styles.fulfillmentDetail}>{detail}</Text></View><Text style={[styles.fulfillmentStatus, route && styles.routeStatus]}>{status}</Text></View>;
}

function OwnerMetric({
  title,
  value,
  note,
  icon,
  warning = false,
}: {
  title: string;
  value: string;
  note: string;
  icon: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.ownerMetric}>
      <View style={styles.ownerMetricTop}>
        <Text style={styles.ownerMetricTitle}>{title}</Text>
        <View style={[styles.ownerMetricIcon, warning && styles.warningIcon]}>
          <Text style={[styles.ownerMetricIconText, warning && styles.warningIconText]}>{icon}</Text>
        </View>
      </View>
      <Text style={[styles.ownerMetricValue, warning && styles.warningValue]}>{value}</Text>
      <Text style={[styles.ownerMetricNote, warning && styles.warningNote]}>{note}</Text>
    </View>
  );
}

function PanelHeading({ title, subtitle, action }: { title: string; subtitle: string; action: string }) {
  return (
    <View style={styles.panelHeading}>
      <View>
        <Text style={styles.panelTitle}>{title}</Text>
        <Text style={styles.panelSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.panelAction}>{action}</Text>
    </View>
  );
}

function StockBar({ label, value, progress, warning = false }: { label: string; value: string; progress: number; warning?: boolean }) {
  return (
    <View style={styles.stockRow}>
      <View style={styles.stockLabelRow}>
        <Text style={styles.stockLabel}>{label}</Text>
        {warning && <Text style={styles.lowStock}>Low stock</Text>}
        <Text style={[styles.stockValue, warning && styles.warningNote]}>{value}</Text>
      </View>
      <View style={styles.stockTrack}>
        <View style={[styles.stockProgress, { width: `${progress * 100}%` }, warning && styles.warningProgress]} />
      </View>
    </View>
  );
}

function QueueItem({ initials, name, detail, status, preparing = false }: { initials: string; name: string; detail: string; status: string; preparing?: boolean }) {
  return (
    <View style={styles.queueItem}>
      <View style={styles.initials}><Text style={styles.initialsText}>{initials}</Text></View>
      <View style={styles.queueDetails}>
        <Text style={styles.queueName}>{name}</Text>
        <Text style={styles.queueDetail}>{detail}</Text>
      </View>
      <Text style={[styles.queueStatus, preparing && styles.preparing]}>{status}</Text>
    </View>
  );
}

function OwnerLogin({ onLogin, onBack }: { onLogin: (email: string, password: string) => Promise<void>; onBack: () => void }) {
  const [email, setEmail] = useState('owner@greenlinemart.lk');
  const [pin, setPin] = useState('••••••••••••');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const submitLogin = () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid email', 'Enter a valid work email address.');
      return;
    }
    if (pin.trim().length < 4) {
      Alert.alert('Invalid PIN', 'Security PIN must contain at least 4 characters.');
      return;
    }
    setIsSubmitting(true);
    setLoginError('');
    onLogin(email.trim(), pin)
      .catch((error: unknown) => {
        setLoginError(error instanceof Error ? error.message : 'Unable to sign in.');
      })
      .finally(() => {
      setIsSubmitting(false);
      });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.customerAuthContent}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onBack}>
        <Text style={styles.customerBack}>‹</Text>
      </Pressable>
      <View style={styles.customerAuthLogo}><Text style={styles.customerAuthLogoText}>GL</Text></View>
      <Text style={styles.customerAuthTitle}>Owner sign in</Text>
      <Text style={styles.customerAuthSubtitle}>Manage Greenline Mart securely</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Work email" placeholderTextColor="#68756f" keyboardType="email-address" autoCapitalize="none" style={styles.customerAuthInput} />
      <TextInput value={pin} onChangeText={setPin} placeholder="Password or security PIN" placeholderTextColor="#68756f" secureTextEntry={!showPin} style={styles.customerAuthInput} />
      <Pressable style={styles.loginVisibility} onPress={() => setShowPin((value) => !value)}>
        <Text style={styles.loginVisibilityText}>{showPin ? 'Hide password' : 'Show password'}</Text>
      </Pressable>
      <Pressable style={styles.customerAuthButton} onPress={submitLogin} disabled={isSubmitting}>
        <Text style={styles.customerAuthButtonText}>{isSubmitting ? 'Signing in…' : 'Sign in as Owner'}</Text>
      </Pressable>
      {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
      <Pressable onPress={() => Alert.alert('Reset password', 'A password reset link will be sent to your registered work email.')}>
        <Text style={styles.customerAuthSwitch}>Forgot password?</Text>
      </Pressable>
      <View style={styles.ownerAccessNote}>
        <Text style={styles.ownerAccessTitle}>Owner access</Text>
        <Text style={styles.ownerAccessText}>Staff, suppliers, orders and reports are managed from the owner dashboard.</Text>
      </View>
    </ScrollView>
  );
}

function CustomerStaff({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'Orders' | 'History' | 'Stock' | 'Messages'>('Orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const refresh = async () => {
      const [savedOrders, savedProducts] = await Promise.all([
        loadOwnerCollection<Order[]>('orders', []),
        loadOwnerCollection<Product[]>('products', []),
      ]);
      setOrders(savedOrders);
      setProducts(savedProducts);
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 3000);
    return () => clearInterval(timer);
  }, []);

  const matchingOrders = orders.filter((order) =>
    `${order.id} ${order.customer} ${order.items}`.toLowerCase().includes(search.toLowerCase()),
  );
  const activeOrders = matchingOrders.filter((order) => !['Completed', 'Cancelled'].includes(order.status));
  const historyOrders = matchingOrders.filter((order) => ['Completed', 'Cancelled'].includes(order.status));
  const updateOrder = async (id: string, status: Order['status']) => {
    const nextOrders = orders.map((order) => order.id === id ? { ...order, status } : order);
    setOrders(nextOrders);
    await saveOwnerCollection('orders', nextOrders);
    const changed = orders.find((order) => order.id === id);
    if (changed) Alert.alert('Order updated', `${changed.id} is now ${status}.`);
  };
  const sendCustomerMessage = async () => {
    if (!selectedCustomer || !message.trim()) {
      Alert.alert('Message required', 'Select an order and write a message first.');
      return;
    }
    const sent = {
      name: selectedCustomer,
      role: 'Customer',
      preview: message.trim(),
      time: new Date().toLocaleString(),
      unread: 0,
      online: true,
    };
    const current = await loadOwnerCollection<Array<typeof sent>>('messages', []);
    await saveOwnerCollection('messages', [sent, ...current]);
    setMessage('');
    Alert.alert('Message sent', `Message sent to ${selectedCustomer}.`);
  };
  const updatePrice = async (product: Product) => {
    const price = priceDrafts[product.name]?.trim();
    if (!price || Number.isNaN(Number(price))) {
      Alert.alert('Invalid price', 'Enter a valid numeric supplier price.');
      return;
    }
    const nextProducts = products.map((item) => item.name === product.name ? { ...item, price: `Rs. ${Number(price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` } : item);
    setProducts(nextProducts);
    await saveOwnerCollection('products', nextProducts);
    Alert.alert('Stock update received', `${product.name} price was updated and is now visible to customers.`);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.userHeader}>
        <View style={styles.userBrand}><Text style={styles.ownerLogo}>GL</Text><Text style={styles.userTitle}>Customer Staff{'\n'}Workspace</Text></View>
        <Pressable onPress={onLogout}><Text style={styles.addStaff}>Log out</Text></Pressable>
      </View>
      <View style={styles.staffPanel}>
        <Text style={styles.staffTitle}>Customer operations</Text>
        <Text style={styles.panelSubtitle}>Orders, history, stock prices and customer messages</Text>
        <View style={styles.staffPortalTabs}>
          {(['Orders', 'History', 'Stock', 'Messages'] as const).map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.staffPortalTab, tab === item && styles.activeStaffPortalTab]}><Text style={[styles.staffPortalTabText, tab === item && styles.activeStaffPortalTabText]}>{item}</Text></Pressable>)}
        </View>
        {(tab === 'Orders' || tab === 'History') && <TextInput value={search} onChangeText={setSearch} placeholder="Search customer orders..." placeholderTextColor="#7b897f" style={styles.formInput} />}
        {tab === 'Orders' && activeOrders.map((order) => <View key={order.id} style={styles.staffOrderCard}><Text style={styles.staffName}>{order.id} • {order.customer}</Text><Text style={styles.panelSubtitle}>{order.items} • {order.date} • {order.amount}</Text><View style={styles.staffOrderActions}><Pressable style={styles.approveButton} onPress={() => updateOrder(order.id, 'Preparing')}><Text style={styles.approveText}>✓ Accept</Text></Pressable><Pressable style={styles.rejectButton} onPress={() => updateOrder(order.id, 'Cancelled')}><Text style={styles.rejectText}>× Reject</Text></Pressable><Pressable onPress={() => { setSelectedCustomer(order.customer); setTab('Messages'); }}><Text style={styles.staffEditAction}>Message</Text></Pressable></View></View>)}
        {tab === 'History' && historyOrders.map((order) => <View key={order.id} style={styles.staffOrderCard}><Text style={styles.staffName}>{order.id} • {order.customer}</Text><Text style={styles.panelSubtitle}>{order.items} • {order.date} • {order.amount}</Text><Text style={[styles.activeBadge, order.status === 'Cancelled' && styles.staffCancelledBadge]}>{order.status}</Text></View>)}
        {tab === 'Stock' && products.map((product) => <View key={product.name} style={styles.staffStockRow}><View style={styles.staffDetails}><Text style={styles.staffName}>{product.name}</Text><Text style={styles.panelSubtitle}>Customer price: {product.price} • {product.stock} units</Text></View><TextInput value={priceDrafts[product.name] ?? ''} onChangeText={(value) => setPriceDrafts((drafts) => ({ ...drafts, [product.name]: value }))} placeholder="New price" keyboardType="decimal-pad" style={styles.staffPriceInput} /><Pressable onPress={() => updatePrice(product)}><Text style={styles.staffEditAction}>Update</Text></Pressable></View>)}
        {tab === 'Messages' && <View><TextInput value={selectedCustomer} onChangeText={setSelectedCustomer} placeholder="Customer name" placeholderTextColor="#7b897f" style={styles.formInput} /><TextInput value={message} onChangeText={setMessage} placeholder="Order update message..." placeholderTextColor="#7b897f" style={[styles.formInput, { height: 80 }]} multiline /><Pressable style={styles.formSubmit} onPress={sendCustomerMessage}><Text style={styles.formSubmitText}>Send message</Text></Pressable><Text style={styles.panelSubtitle}>Messages include the current date and time automatically.</Text></View>}
        {((tab === 'Orders' && !activeOrders.length) || (tab === 'History' && !historyOrders.length) || (tab === 'Stock' && !products.length)) && <Text style={styles.panelSubtitle}>No records available.</Text>}
      </View>
    </ScrollView>
  );
}

type Order = { id: string; customer: string; items: string; date: string; amount: string; status: 'Awaiting' | 'Completed' | 'Preparing' | 'Cancelled'; type: string };

function Orders({ onBack, onOpenInventory, onOpenMessages }: { onBack: () => void; onOpenInventory: () => void; onOpenMessages: () => void }) {
  const [tab, setTab] = useState('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  useEffect(() => {
    loadOwnerCollection('orders', []).then(setOrders).finally(() => setOrdersLoaded(true));
  }, []);
  useEffect(() => {
    const timer = setInterval(() => { void loadOwnerCollection('orders', []).then(setOrders); }, 3000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (ordersLoaded) void saveOwnerCollection('orders', orders);
  }, [orders, ordersLoaded]);
  const filteredOrders = orders.filter((order) => tab === 'All' || order.type === tab || order.status === tab);
  const advanceOrder = (id: string) => {
    setOrders((items) => items.map((order) => {
      if (order.id !== id) return order;
      const nextStatus: Order['status'] = order.status === 'Awaiting' ? 'Preparing' : order.status === 'Preparing' ? 'Completed' : order.status;
      return { ...order, status: nextStatus };
    }));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.ordersHeader}>
        <Pressable onPress={onBack} style={styles.reportBack}><Text style={styles.reportBackText}>‹</Text></Pressable>
        <View style={styles.ordersBrand}><Text style={styles.ownerLogo}>GL</Text><Text style={styles.ordersTitle}>Orders</Text></View>
        <View style={styles.ownerHeaderActions}><Text style={styles.bell}>♧</Text><View style={styles.avatar}><Text style={styles.avatarText}>OW</Text></View></View>
      </View>
      <View style={styles.registerBanner}><Text style={styles.registerLive}>● LIVE REGISTER</Text><Text style={styles.registerText}>Today: <Text style={styles.registerAmount}>{orders.filter((order) => order.status === 'Completed').reduce((total, order) => total + (Number(order.amount.replace(/[^0-9.-]/g, '')) || 0), 0).toLocaleString('en-LK')}</Text></Text><Text style={styles.registerSeparator}>•</Text><Text style={styles.registerText}>Active: <Text style={styles.registerAmount}>{orders.filter((order) => !['Completed', 'Cancelled'].includes(order.status)).length} queue</Text></Text></View>
      <View style={styles.orderTabs}>{['All', 'Pre-Order', 'In-Store', 'Completed'].map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.orderTab, tab === item && styles.activeOrderTab]}><Text style={[styles.orderTabText, tab === item && styles.activeOrderTabText]}>{item}</Text></Pressable>)}</View>
      <View style={styles.ordersPanel}>{filteredOrders.map((order) => <Pressable key={order.id} style={styles.orderListItem} onPress={() => advanceOrder(order.id)}><View style={[styles.orderTypeIcon, order.status === 'Cancelled' && styles.cancelledIcon, order.status === 'Completed' && styles.completedIcon]}><Text style={styles.orderTypeIconText}>{order.status === 'Completed' ? '⌁' : order.status === 'Cancelled' ? '×' : order.status === 'Preparing' ? '≋' : '♧'}</Text></View><View style={styles.orderListDetails}><Text style={styles.orderListTitle}>{order.id} • {order.customer}</Text><Text style={styles.orderListMeta}>{order.items} • {order.date}</Text></View><View style={styles.orderAmount}><Text style={styles.orderAmountText}>{order.amount}</Text><Text style={[styles.orderStatus, order.status === 'Awaiting' && styles.statusAwaiting, order.status === 'Completed' && styles.statusCompleted, order.status === 'Preparing' && styles.statusPreparing, order.status === 'Cancelled' && styles.statusCancelled]}>{order.status}</Text></View></Pressable>)}</View>
      <View style={styles.dailySummary}><Text style={styles.summaryIcon}>▤</Text><View style={styles.summaryDetails}><Text style={styles.summaryTitle}>Daily Summary Report</Text><Text style={styles.summarySubtitle}>Ready for download & sync</Text></View><Pressable style={styles.exportButton} onPress={() => Alert.alert('Export started', 'Daily summary is being prepared for download.')}><Text style={styles.exportText}>Export ⇩</Text></Pressable></View>
      <View style={styles.bottomNav}>{[['⌂', 'Home'], ['🛒', 'Inventory'], ['▤', 'Orders'], ['□', 'Messages']].map(([icon, label], index) => <Pressable key={label} style={styles.navItem} onPress={index === 0 ? onBack : index === 1 ? onOpenInventory : index === 3 ? onOpenMessages : undefined}><Text style={[styles.navIcon, index === 2 && styles.activeNav]}>{icon}</Text><Text style={[styles.navLabel, index === 2 && styles.activeNav]}>{label}</Text></Pressable>)}</View>
    </ScrollView>
  );
}

export default function App() {
  const [screen, setScreen] = useState<'role' | 'login' | 'dashboard' | 'orders' | 'reports' | 'users' | 'settings' | 'notifications' | 'inventory' | 'supplier-progress' | 'messages' | 'customer-login' | 'customer-home' | 'customer-profile' | 'staff-login' | 'customer-staff' | 'supplier-login' | 'supplier-portal'>('role');
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfile | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {screen === 'role' ? (
        <RoleSelection onOwner={() => setScreen('login')} onCustomer={() => setScreen('customer-login')} onStaff={() => setScreen('staff-login')} onSupplier={() => setScreen('supplier-login')} />
      ) : screen === 'login' ? (
        <OwnerLogin onBack={() => setScreen('role')} onLogin={async (email, password) => {
          await signInOwner(email, password);
          setScreen('dashboard');
        }} />
      ) : screen === 'dashboard' ? (
        <Dashboard onOpenOrders={() => setScreen('orders')} onOpenReports={() => setScreen('reports')} onOpenUsers={() => setScreen('users')} onOpenSettings={() => setScreen('settings')} onOpenNotifications={() => setScreen('notifications')} onOpenInventory={() => setScreen('inventory')} onOpenMessages={() => setScreen('messages')} />
      ) : screen === 'reports' ? (
        <Reports onBack={() => setScreen('dashboard')} onOpenSupplierProgress={() => setScreen('supplier-progress')} onOpenInventory={() => setScreen('inventory')} onOpenMessages={() => setScreen('messages')} />
      ) : screen === 'users' ? (
        <UserManagement onBack={() => setScreen('dashboard')} />
      ) : screen === 'settings' ? (
        <Settings onBack={() => setScreen('dashboard')} onOpenInventory={() => setScreen('inventory')} onOpenOrders={() => setScreen('orders')} onOpenMessages={() => setScreen('messages')} onOpenCustomerProfile={() => setScreen('customer-profile')} onLogout={async () => { await signOutOwner(); setScreen('role'); }} />
      ) : screen === 'notifications' ? (
        <Notifications onBack={() => setScreen('dashboard')} onOpenInventory={() => setScreen('inventory')} onOpenOrders={() => setScreen('orders')} onOpenMessages={() => setScreen('messages')} />
      ) : screen === 'inventory' ? (
        <Inventory onBack={() => setScreen('dashboard')} onOpenOrders={() => setScreen('orders')} onOpenMessages={() => setScreen('messages')} />
      ) : screen === 'supplier-progress' ? (
        <SupplierProgress onBack={() => setScreen('reports')} onOpenInventory={() => setScreen('inventory')} onOpenOrders={() => setScreen('orders')} onOpenMessages={() => setScreen('messages')} />
      ) : screen === 'messages' ? (
        <Messages onBack={() => setScreen('dashboard')} onOpenInventory={() => setScreen('inventory')} onOpenOrders={() => setScreen('orders')} />
      ) : screen === 'customer-login' ? (
        <CustomerLogin onBack={() => setScreen('role')} onLogin={() => setScreen('customer-home')} />
      ) : screen === 'customer-home' ? (
        <CustomerHome onProfile={() => setScreen('customer-profile')} onLogout={() => setScreen('role')} />
      ) : screen === 'customer-profile' ? (
        <CustomerChangePassword onBack={() => setScreen('customer-home')} />
      ) : screen === 'staff-login' ? (
        <StaffLogin onBack={() => setScreen('role')} onLogin={() => setScreen('customer-staff')} />
      ) : screen === 'customer-staff' ? (
        <CustomerStaff onLogout={() => setScreen('role')} />
      ) : screen === 'supplier-login' ? (
        <SupplierLogin onBack={() => setScreen('role')} onLogin={(profile) => { setSupplierProfile(profile); setScreen('supplier-portal'); }} />
      ) : screen === 'supplier-portal' && supplierProfile ? (
        <SupplierPortal profile={supplierProfile} onProfileUpdate={setSupplierProfile} onLogout={async () => { await signOutSupplier(); setSupplierProfile(null); setScreen('role'); }} />
      ) : (
        <Orders onBack={() => setScreen('dashboard')} onOpenInventory={() => setScreen('inventory')} onOpenMessages={() => setScreen('messages')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f8ef',
  },
  roleScreen: { flex: 1, backgroundColor: '#e8f8ef', paddingHorizontal: 28, paddingTop: 100 },
  roleLogo: { width: 72, height: 72, borderRadius: 18, backgroundColor: '#203b32', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  roleLogoText: { color: '#fff', fontSize: 25, fontWeight: '900' },
  roleBrand: { color: '#1d332a', textAlign: 'center', fontSize: 24, fontWeight: '800', marginTop: 14 },
  roleTitle: { color: '#14221b', fontSize: 31, fontWeight: '900', textAlign: 'center', marginTop: 70 },
  roleSubtitle: { color: '#62736a', fontSize: 17, textAlign: 'center', marginTop: 10, marginBottom: 34 },
  roleCard: { minHeight: 112, borderRadius: 22, backgroundColor: '#fff', marginBottom: 16, padding: 18, flexDirection: 'row', alignItems: 'center', shadowColor: '#57816a', shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  roleIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#d8f4df', color: '#197633', fontSize: 27, textAlign: 'center', textAlignVertical: 'center' },
  roleCardDetails: { flex: 1, marginLeft: 16 },
  roleCardTitle: { color: '#17251d', fontSize: 21, fontWeight: '800' },
  roleCardText: { color: '#66766d', fontSize: 14, marginTop: 5, lineHeight: 20 },
  roleArrow: { color: '#237b36', fontSize: 34, marginLeft: 8 },
  roleFooter: { color: '#7a8a81', textAlign: 'center', marginTop: 35, fontSize: 14 },
  customerAuthContent: { flexGrow: 1, backgroundColor: '#e8f8ef', paddingHorizontal: 30, paddingTop: 50, paddingBottom: 50 },
  customerAuthLogo: { width: 70, height: 70, borderRadius: 18, backgroundColor: '#203b32', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 30 },
  customerAuthLogoText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  customerAuthTitle: { color: '#15231c', textAlign: 'center', fontSize: 31, fontWeight: '900', marginTop: 22 },
  customerAuthSubtitle: { color: '#66776d', textAlign: 'center', fontSize: 16, marginTop: 8, marginBottom: 42 },
  customerAuthInput: { height: 60, borderRadius: 18, backgroundColor: '#fff', paddingHorizontal: 20, color: '#18231d', fontSize: 17, marginBottom: 16 },
  customerAuthButton: { height: 60, borderRadius: 30, backgroundColor: '#2e8b32', alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  customerAuthButtonText: { color: '#fff', fontSize: 19, fontWeight: '800' },
  customerAuthSwitch: { color: '#237b36', textAlign: 'center', fontSize: 15, fontWeight: '700', marginTop: 24 },
  customerProfileHeading: { color: '#18251e', fontSize: 25, fontWeight: '900', marginBottom: 18 },
  customerProfileSave: { height: 54, borderRadius: 27, backgroundColor: '#d8f4df', alignItems: 'center', justifyContent: 'center', marginBottom: 42 },
  customerProfileSaveText: { color: '#237b36', fontSize: 17, fontWeight: '800' },
  customerShop: { flex: 1, backgroundColor: '#f4fbf7' },
  customerShopContent: { padding: 20, paddingBottom: 30 },
  customerShopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  customerShopGreeting: { color: '#66776d', fontSize: 15 },
  customerShopTitle: { color: '#15231c', fontSize: 25, fontWeight: '900', marginTop: 5 },
  customerProfileCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#b9e5c3', alignItems: 'center', justifyContent: 'center' },
  customerProfileEmoji: { color: '#237b36', fontSize: 24 },
  customerSearch: { height: 54, borderRadius: 17, backgroundColor: '#e5f2e9', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 25 },
  customerSearchIcon: { color: '#4e6757', fontSize: 25 },
  customerSearchInput: { flex: 1, color: '#203228', fontSize: 16, marginLeft: 10 },
  customerPromo: { borderRadius: 20, backgroundColor: '#2e8b32', padding: 20, marginTop: 22 },
  customerPromoTitle: { color: '#fff', fontSize: 21, fontWeight: '900' },
  customerPromoText: { color: '#d7f3dc', fontSize: 14, marginTop: 6 },
  customerPromoLink: { color: '#fff', fontWeight: '800', fontSize: 15, marginTop: 15 },
  customerSectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 27, marginBottom: 12 },
  customerSectionTitle: { color: '#18251e', fontSize: 21, fontWeight: '900' },
  customerViewAll: { color: '#237b36', fontWeight: '700' },
  customerProductCard: { minHeight: 94, backgroundColor: '#fff', borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  customerProductImage: { width: 70, height: 70, borderRadius: 15, backgroundColor: '#eef8ee', alignItems: 'center', justifyContent: 'center' },
  customerProductEmoji: { fontSize: 35 },
  customerProductDetails: { flex: 1, marginLeft: 14 },
  customerProductName: { color: '#1c2b22', fontSize: 17, fontWeight: '800' },
  customerProductPrice: { color: '#237b36', fontSize: 16, fontWeight: '800', marginTop: 5 },
  customerAvailable: { color: '#6c7d72', fontSize: 12, marginTop: 3 },
  customerAddButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#d8f4df', alignItems: 'center', justifyContent: 'center' },
  customerAddText: { color: '#237b36', fontSize: 26, fontWeight: '700' },
  customerOrdersBanner: { minHeight: 75, borderRadius: 17, backgroundColor: '#e5f2e9', padding: 15, flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  customerOrdersIcon: { color: '#237b36', fontSize: 27 },
  customerOrdersDetails: { flex: 1, marginLeft: 13 },
  customerOrdersTitle: { color: '#1c2b22', fontSize: 16, fontWeight: '800' },
  customerOrdersText: { color: '#66776d', fontSize: 13, marginTop: 3 },
  customerArrow: { color: '#237b36', fontSize: 30 },
  customerLogout: { alignItems: 'center', padding: 16, marginTop: 10 },
  customerLogoutText: { color: '#b32828', fontWeight: '700' },
  customerCartIcon: { color: '#237b36' },
  customerPagePanel: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginTop: 20 },
  customerPageTitle: { color: '#18251e', fontSize: 23, fontWeight: '900' },
  customerPageText: { color: '#66776d', fontSize: 15, marginTop: 12, lineHeight: 22 },
  customerOrderId: { color: '#237b36', fontWeight: '800', marginTop: 12 },
  customerStatusRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#e1eee4' },
  customerStatusLabel: { color: '#66776d', fontSize: 15 },
  customerStatusValue: { color: '#a56708', fontWeight: '900' },
  customerAccepted: { color: '#237b36' },
  customerRejected: { color: '#c33333' },
  customerOutlineButton: { borderWidth: 1, borderColor: '#2e8b32', borderRadius: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  customerOutlineText: { color: '#237b36', fontWeight: '800' },
  customerMessage: { color: '#33463a', backgroundColor: '#e5f2e9', borderRadius: 12, padding: 12, marginTop: 14, lineHeight: 21 },
  customerMessageFrom: { color: '#237b36', fontWeight: '900' },
  customerSmallInput: { minHeight: 48, borderRadius: 12, backgroundColor: '#f0f7f1', paddingHorizontal: 12, color: '#203228', marginTop: 12 },
  customerScreen: {
    flex: 1,
    backgroundColor: '#dff6ea',
  },
  customerTopBar: {
    height: 92,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerBack: {
    color: '#17251f',
    fontSize: 42,
    lineHeight: 42,
  },
  customerTopTitle: {
    color: '#18201d',
    fontSize: 24,
    fontWeight: '800',
    marginRight: 'auto',
    marginLeft: 18,
  },
  customerSettings: {
    color: '#18201d',
    fontSize: 31,
  },
  customerContent: {
    paddingHorizontal: 32,
    paddingTop: 150,
    paddingBottom: 50,
  },
  customerHeading: {
    color: '#080d0b',
    fontSize: 43,
    fontFamily: 'serif',
    marginBottom: 82,
  },
  customerInput: {
    height: 95,
    borderRadius: 28,
    backgroundColor: '#fff',
    paddingHorizontal: 35,
    color: '#1b211e',
    fontSize: 27,
    marginBottom: 28,
  },
  customerChangeButton: {
    height: 75,
    borderRadius: 40,
    backgroundColor: '#2e8b32',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 95,
    marginTop: 84,
  },
  customerChangeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  deletePrompt: {
    color: '#1c211f',
    textAlign: 'center',
    fontSize: 25,
    marginTop: 72,
    marginBottom: 42,
  },
  deleteButton: {
    height: 75,
    borderRadius: 40,
    backgroundColor: '#ff3035',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 95,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  customerBottomNav: {
    height: 90,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  customerNavItem: {
    alignItems: 'center',
  },
  customerNavIcon: {
    color: '#606568',
    fontSize: 27,
  },
  customerNavLabel: {
    color: '#666b6d',
    fontSize: 15,
    marginTop: 4,
  },
  customerActiveNav: {
    color: '#2e8b32',
    fontWeight: '800',
  },
  customerProfileLink: {
    alignItems: 'center',
    marginTop: 18,
    padding: 10,
  },
  customerProfileLinkText: {
    color: '#15732e',
    fontSize: 16,
    fontWeight: '800',
  },
  ownerLogoutButton: {
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: '#fff0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  ownerLogoutText: {
    color: '#b32828',
    fontSize: 16,
    fontWeight: '800',
  },
  loginContent: {
    flexGrow: 1,
    backgroundColor: '#e8f8ef',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
  },
  loginPageLabel: {
    color: '#9bc7ac',
    fontSize: 11,
    marginBottom: 6,
  },
  loginCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 28,
    alignItems: 'stretch',
  },
  brandMark: {
    width: 56,
    height: 56,
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: '#263b38',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandLetters: {
    color: '#f3ffff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandCheck: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#126e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCheckText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  brandName: {
    alignSelf: 'center',
    color: '#1e2d2e',
    fontSize: 16,
    fontWeight: '700',
  },
  portalBadge: {
    alignSelf: 'center',
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#e0f0f0',
  },
  portalBadgeText: {
    color: '#536a5e',
    fontSize: 8,
    fontWeight: '800',
  },
  fieldHeader: {
    marginTop: 28,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pinHeader: {
    marginTop: 18,
  },
  fieldLabel: {
    color: '#354440',
    fontSize: 10,
    fontWeight: '600',
  },
  authorized: {
    color: '#197130',
    fontSize: 8,
    fontWeight: '800',
  },
  inputRow: {
    height: 34,
    borderRadius: 9,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
  },
  inputIcon: {
    color: '#71817b',
    fontSize: 15,
    width: 23,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    color: '#23332d',
    fontSize: 10,
  },
  verified: {
    color: '#157b2e',
    fontSize: 17,
  },
  eye: {
    color: '#6c7c76',
    fontSize: 17,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  keepSignedIn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#80908a',
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#14712c',
    borderColor: '#14712c',
  },
  checkmark: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  optionText: {
    color: '#52605b',
    fontSize: 9,
  },
  biometric: {
    borderRadius: 10,
    backgroundColor: '#e3f4e6',
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fingerprint: {
    color: '#278343',
    fontSize: 15,
    marginRight: 3,
  },
  biometricText: {
    color: '#23753a',
    fontSize: 8,
    fontWeight: '700',
  },
  loginButton: {
    height: 58,
    marginTop: 22,
    borderRadius: 30,
    backgroundColor: '#2c8737',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  loginError: {
    color: '#b32828',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  loginVisibility: {
    alignSelf: 'flex-end',
    marginTop: -6,
    marginBottom: 4,
    paddingVertical: 8,
  },
  loginVisibilityText: {
    color: '#237b36',
    fontSize: 14,
    fontWeight: '700',
  },
  ownerAccessNote: {
    marginTop: 28,
    borderRadius: 18,
    backgroundColor: '#d8f4df',
    padding: 16,
  },
  ownerAccessTitle: {
    color: '#18251e',
    fontSize: 16,
    fontWeight: '800',
  },
  ownerAccessText: {
    color: '#52705c',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  forgotPassword: {
    color: '#425049',
    textAlign: 'center',
    fontSize: 9,
    marginTop: 14,
  },
  storeCard: {
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: '#fff',
    marginTop: 32,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIcon: {
    width: 23,
    height: 23,
    borderRadius: 7,
    backgroundColor: '#d9f3dc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  storeDetails: {
    flex: 1,
  },
  storeTitle: {
    color: '#354440',
    fontSize: 8,
    fontWeight: '800',
  },
  storeSubtitle: {
    color: '#65746e',
    fontSize: 8,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1b8c38',
  },
  encryption: {
    color: '#75817d',
    textAlign: 'center',
    fontSize: 8,
    marginTop: 11,
    marginBottom: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    backgroundColor: '#e8f8ef',
  },
  addProductForm: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  formInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#c8d8d1',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#20312d',
    backgroundColor: '#f8fcfa',
  },
  formSubmit: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#087426',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitText: {
    color: '#fff',
    fontWeight: '800',
  },
  ownerHeader: {
    height: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#e3ebef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: -16,
    paddingHorizontal: 24,
    backgroundColor: '#e8f8ef',
  },
  ownerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerLogo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#d8f4df',
    color: '#237b36',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  ownerTitle: {
    color: '#13252e',
    fontSize: 25,
    fontWeight: '800',
  },
  ownerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  bell: {
    color: '#314139',
    fontSize: 28,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 24,
    backgroundColor: '#d8f4df',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: { color: '#237b36', fontSize: 13, fontWeight: '900' },
  snapshotHeading: {
    paddingTop: 24,
    paddingBottom: 14,
  },
  eyebrow: {
    color: '#177431',
    fontSize: 17,
    letterSpacing: 1,
    fontWeight: '800',
  },
  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  snapshotTitle: {
    color: '#13252e',
    fontSize: 30,
    fontWeight: '800',
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e5f2e9',
  },
  syncDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#12843b',
    marginRight: 6,
  },
  syncText: {
    color: '#52705c',
    fontSize: 16,
  },
  ownerMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  ownerMetric: {
    width: '48%',
    minHeight: 125,
    borderRadius: 17,
    backgroundColor: '#fff',
    padding: 14,
    shadowColor: '#57816a',
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ownerMetricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ownerMetricTitle: {
    color: '#515a54',
    fontSize: 14,
    flex: 1,
  },
  ownerMetricIcon: {
    width: 50,
    height: 50,
    borderRadius: 13,
    backgroundColor: '#d8f4df',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerMetricIconText: {
    color: '#237b36',
    fontSize: 29,
    fontWeight: '700',
  },
  warningIcon: {
    backgroundColor: '#ffdbc3',
  },
  warningIconText: {
    color: '#9b5608',
  },
  ownerMetricValue: {
    color: '#16252d',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 14,
  },
  warningValue: {
    color: '#985307',
  },
  ownerMetricNote: {
    color: '#56615b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  warningNote: {
    color: '#985307',
  },
  ownerPanel: {
    backgroundColor: '#fff',
    borderRadius: 22,
    marginTop: 14,
    padding: 16,
    shadowColor: '#57816a',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  panelHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  panelTitle: {
    color: '#16252d',
    fontSize: 21,
    fontWeight: '800',
  },
  panelSubtitle: {
    color: '#59645e',
    fontSize: 14,
    marginTop: 2,
  },
  panelAction: {
    color: '#15732e',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 7,
  },
  chart: {
    height: 150,
    marginTop: 12,
    position: 'relative',
  },
  chartEmptyState: {
    height: 150,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#f4faf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyValue: {
    color: '#1b7130',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  chartGuide: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 48,
    borderTopWidth: 1,
    borderColor: '#dcebf1',
    borderStyle: 'dashed',
  },
  chartGuideMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 98,
    borderTopWidth: 1,
    borderColor: '#dcebf1',
    borderStyle: 'dashed',
  },
  chartLine: {
    height: 2,
    backgroundColor: '#2d8240',
    position: 'absolute',
    left: 12,
    right: 12,
    top: 106,
    transform: [{ rotate: '-12deg' }],
  },
  chartPoint: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#2d8240',
    backgroundColor: '#fff',
  },
  chartLastPoint: {
    backgroundColor: '#2d8240',
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    color: '#47534d',
    fontSize: 16,
    fontWeight: '700',
  },
  activeDay: {
    color: '#15732e',
  },
  stockRow: {
    marginTop: 22,
  },
  stockLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    color: '#1b2b32',
    fontSize: 19,
    fontWeight: '700',
  },
  stockValue: {
    marginLeft: 'auto',
    color: '#59645e',
    fontSize: 17,
    fontWeight: '600',
  },
  lowStock: {
    color: '#4c2d18',
    backgroundColor: '#ffd9bd',
    borderRadius: 7,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 10,
  },
  stockTrack: {
    height: 15,
    borderRadius: 8,
    backgroundColor: '#e5f2e9',
    marginTop: 8,
    overflow: 'hidden',
  },
  stockProgress: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#2b8139',
  },
  warningProgress: {
    backgroundColor: '#bd6b00',
  },
  queueItem: {
    marginTop: 12,
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: '#e5f2e9',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  initials: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9dff91',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#173128',
    fontSize: 18,
    fontWeight: '800',
  },
  queueDetails: {
    flex: 1,
    marginLeft: 12,
  },
  queueName: {
    color: '#1b2b32',
    fontSize: 18,
    fontWeight: '800',
  },
  queueDetail: {
    color: '#58665f',
    fontSize: 15,
    marginTop: 3,
  },
  queueStatus: {
    color: '#4c5e62',
    backgroundColor: '#e5f2e9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '800',
  },
  preparing: {
    color: '#167233',
    backgroundColor: '#d8f4df',
  },
  storeStatus: {
    marginTop: 18,
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: '#dff3e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeStatusText: {
    color: '#172a31',
    fontSize: 18,
    fontWeight: '700',
  },
  openText: {
    color: '#197734',
  },
  newSale: {
    backgroundColor: '#09752b',
    borderRadius: 16,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  newSaleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomNav: {
    marginHorizontal: -16,
    marginTop: 18,
    minHeight: 78,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e3ebef',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    minWidth: 72,
  },
  navIcon: {
    color: '#68756d',
    fontSize: 27,
  },
  navLabel: {
    color: '#788178',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  activeNav: {
    color: '#2e8b32',
  },
  messagesHeader: { height: 72, marginHorizontal: -16, paddingHorizontal: 20, backgroundColor: '#e8f8ef', borderBottomWidth: 1, borderBottomColor: '#e3ebef', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  messagesBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 'auto' },
  messagesTitle: { color: '#13252e', fontSize: 28, fontWeight: '800' },
  commsRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  commsStatus: { color: '#17272f', fontSize: 19, fontWeight: '800' },
  onlineBadge: { color: '#197633', backgroundColor: '#9afa9b', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, fontSize: 17, fontWeight: '800', marginLeft: 8 },
  broadcast: { color: '#16742e', fontSize: 18, fontWeight: '800', marginLeft: 'auto' },
  messageSearch: { height: 54, borderRadius: 17, backgroundColor: '#e5f2e9', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  messageFilters: { gap: 8, paddingVertical: 10 },
  messageFilter: { minHeight: 44, borderRadius: 22, backgroundColor: '#fff', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  activeMessageFilter: { backgroundColor: '#2e8b32' },
  messageFilterText: { color: '#17272f', fontSize: 14, fontWeight: '800' },
  activeMessageFilterText: { color: '#fff' },
  messageCard: { minHeight: 94, borderRadius: 17, backgroundColor: '#fff', marginTop: 12, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#57816a', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  messageAvatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#9e7550', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  messageAvatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  presenceDot: { position: 'absolute', width: 19, height: 19, borderRadius: 10, right: -2, bottom: 1, backgroundColor: '#9afa9b', borderWidth: 2, borderColor: '#fff' },
  offlineDot: { backgroundColor: '#d5e2e8' },
  messageDetails: { flex: 1, marginLeft: 15 },
  messageTitleRow: { flexDirection: 'row', alignItems: 'center' },
  messageName: { color: '#17272f', fontSize: 18, fontWeight: '800' },
  messageRole: { color: '#526158', backgroundColor: '#e3f0f5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 16, fontWeight: '800', marginLeft: 8 },
  messageTime: { color: '#7d887f', fontSize: 16, marginLeft: 'auto' },
  unreadTime: { color: '#177532', fontWeight: '800' },
  messagePreview: { color: '#536159', backgroundColor: '#e5f2e9', borderRadius: 13, paddingHorizontal: 11, paddingVertical: 6, fontSize: 14, marginTop: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  unreadCount: { width: 42, height: 42, borderRadius: 21, color: '#fff', backgroundColor: '#2e8b32', textAlign: 'center', textAlignVertical: 'center', fontSize: 19, fontWeight: '800', marginLeft: 8 },
  readCheck: { color: '#728077', fontSize: 27, marginLeft: 10 },
  messageComposer: { marginTop: 16, borderRadius: 18, backgroundColor: '#fff', padding: 16, shadowColor: '#52727e', shadowOpacity: 0.08, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  composerTitle: { color: '#17272f', fontSize: 19, fontWeight: '800', marginBottom: 10 },
  composerInput: { minHeight: 80, borderWidth: 1, borderColor: '#c8d8d1', borderRadius: 12, padding: 12, color: '#20312d', textAlignVertical: 'top' },
  composerActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 12 },
  cancelComposer: { color: '#68756f', fontWeight: '700', fontSize: 16 },
  sendMessageButton: { borderRadius: 10, backgroundColor: '#2e8b32', paddingHorizontal: 20, paddingVertical: 10 },
  sendMessageText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  composeButton: { position: 'absolute', right: 20, bottom: 98, zIndex: 4, width: 62, height: 62, borderRadius: 31, backgroundColor: '#2e8b32', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  composeIcon: { color: '#fff', fontSize: 38 },
  ordersHeader: { height: 72, marginHorizontal: -16, paddingHorizontal: 20, backgroundColor: '#e8f8ef', borderBottomWidth: 1, borderBottomColor: '#e3ebef', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ordersBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 'auto' },
  ordersTitle: { color: '#13252e', fontSize: 28, fontWeight: '800' },
  registerBanner: { minHeight: 62, marginTop: 14, borderRadius: 20, paddingHorizontal: 18, backgroundColor: '#e5f2e9', flexDirection: 'row', alignItems: 'center', gap: 10 },
  registerLive: { color: '#16752f', fontSize: 18, fontWeight: '800' },
  registerText: { color: '#59665f', fontSize: 17 },
  registerAmount: { color: '#17272f', fontWeight: '800' },
  registerSeparator: { color: '#bdc9c4', fontSize: 22 },
  orderTabs: { flexDirection: 'row', gap: 8, marginVertical: 20 },
  orderTab: { flex: 1, minHeight: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  activeOrderTab: { backgroundColor: '#2e8b32' },
  orderTabText: { color: '#17272f', fontSize: 14, fontWeight: '800' },
  activeOrderTabText: { color: '#fff' },
  ordersPanel: { borderRadius: 17, backgroundColor: '#fff', paddingHorizontal: 14, shadowColor: '#57816a', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  orderListItem: { minHeight: 120, borderBottomWidth: 1, borderBottomColor: '#dce8ed', paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  orderTypeIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ffddbf', alignItems: 'center', justifyContent: 'center' },
  completedIcon: { backgroundColor: '#9af59b' },
  cancelledIcon: { backgroundColor: '#ffd8d8' },
  orderTypeIconText: { color: '#a25c09', fontSize: 31, fontWeight: '800' },
  orderListDetails: { flex: 1, marginLeft: 14 },
  orderListTitle: { color: '#17272f', fontSize: 20, fontWeight: '800' },
  orderListMeta: { color: '#59665f', fontSize: 17, lineHeight: 24, marginTop: 4 },
  orderAmount: { alignItems: 'flex-end', marginLeft: 8 },
  orderAmountText: { color: '#17272f', fontSize: 20, fontWeight: '800' },
  orderStatus: { borderRadius: 17, paddingHorizontal: 12, paddingVertical: 6, fontSize: 16, fontWeight: '800', marginTop: 7 },
  statusAwaiting: { color: '#fff', backgroundColor: '#b76800' },
  statusCompleted: { color: '#fff', backgroundColor: '#2e8b32' },
  statusPreparing: { color: '#8d4b08', backgroundColor: '#ffb876' },
  statusCancelled: { color: '#c62222', backgroundColor: '#dcebf4' },
  dailySummary: { minHeight: 110, borderRadius: 20, backgroundColor: '#e5f2e9', padding: 20, marginTop: 18, flexDirection: 'row', alignItems: 'center' },
  summaryIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#d3e9ec', color: '#14752d', fontSize: 31, textAlign: 'center', textAlignVertical: 'center' },
  summaryDetails: { flex: 1, marginLeft: 14 },
  summaryTitle: { color: '#17272f', fontSize: 19, fontWeight: '800' },
  summarySubtitle: { color: '#59665f', fontSize: 16, marginTop: 4 },
  exportButton: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16 },
  exportText: { color: '#177532', fontSize: 18, fontWeight: '800' },
  supplierHeader: {
    height: 72, marginHorizontal: -16, paddingHorizontal: 20, backgroundColor: '#e8f8ef',
    borderBottomWidth: 1, borderBottomColor: '#e3ebef', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  supplierBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 'auto' },
  supplierTitle: { color: '#13252e', fontSize: 27, fontWeight: '800' },
  supplierSync: { minHeight: 62, borderRadius: 31, backgroundColor: '#e5f5fc', marginTop: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  supplierSyncText: { color: '#17272f', fontSize: 20, fontWeight: '800', flex: 1, marginLeft: 12 },
  supplierStats: { flexDirection: 'row', gap: 14, marginTop: 14 },
  supplierStat: { flex: 1, minHeight: 170, borderRadius: 20, backgroundColor: '#fff', padding: 22, shadowColor: '#52727e', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  supplierStatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  supplierStatLabel: { color: '#536057', fontSize: 18, fontWeight: '800' },
  supplierStatIcon: { color: '#177633', backgroundColor: '#e5f5fc', borderRadius: 12, padding: 8, fontSize: 22 },
  greenIcon: { backgroundColor: '#c9f9d0' },
  supplierStatValue: { color: '#17272f', fontSize: 36, fontWeight: '800', marginTop: 18 },
  hours: { color: '#526058', fontSize: 20, fontWeight: '400' },
  supplierStatNote: { color: '#227936', fontSize: 18, fontWeight: '700', marginTop: 6 },
  supplierPanel: { borderRadius: 17, backgroundColor: '#fff', padding: 16, marginTop: 14, shadowColor: '#57816a', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  supplierPanelHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  supplierHeadingLeft: { flexDirection: 'row', alignItems: 'center' },
  headingAccent: { width: 14, height: 30, borderRadius: 8, backgroundColor: '#087426', marginRight: 12 },
  supplierPanelTitle: { color: '#17272f', fontSize: 21, fontWeight: '800' },
  filterText: { color: '#13732c', fontSize: 18, fontWeight: '800' },
  supplierRow: { minHeight: 128, borderBottomWidth: 1, borderBottomColor: '#e2e8e3', paddingVertical: 15, flexDirection: 'row', alignItems: 'flex-start' },
  supplierLogo: { width: 70, height: 70, borderRadius: 13, backgroundColor: '#d8c8a7', alignItems: 'center', justifyContent: 'center' },
  supplierRowDetails: { flex: 1, marginLeft: 14 },
  supplierName: { color: '#17272f', fontSize: 23, fontWeight: '800' },
  supplierDetail: { color: '#59665f', fontSize: 17, marginTop: 4 },
  supplierProgressTrack: { height: 11, borderRadius: 6, backgroundColor: '#e0f1f7', marginTop: 14, overflow: 'hidden' },
  supplierProgressFill: { height: '100%', borderRadius: 6, backgroundColor: '#087426' },
  supplierScore: { alignItems: 'flex-end', marginLeft: 8 },
  scoreText: { color: '#17272f', fontSize: 29, fontWeight: '800' },
  onTime: { color: '#fff', backgroundColor: '#087426', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, fontSize: 15, fontWeight: '800', marginTop: 6 },
  viewSuppliers: { color: '#16772f', fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 17 },
  performanceTitle: { color: '#17272f', fontSize: 28, fontWeight: '800' },
  performanceSubtitle: { color: '#59665f', fontSize: 17, marginTop: 3 },
  performanceContent: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  healthRing: { width: 190, height: 190, borderRadius: 95, borderWidth: 26, borderColor: '#087426', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  healthValue: { color: '#17272f', fontSize: 38, fontWeight: '800' },
  healthLabel: { color: '#536057', fontSize: 17, fontWeight: '800', marginTop: 2 },
  performanceLegend: { flex: 1, marginLeft: 20, gap: 12 },
  legendCard: { minHeight: 92, borderRadius: 14, backgroundColor: '#e8f7fd', padding: 13, flexDirection: 'row' },
  greenSquare: { width: 22, height: 22, borderRadius: 3, backgroundColor: '#087426', marginRight: 11 },
  graySquare: { width: 22, height: 22, borderRadius: 3, backgroundColor: '#d6e5ed', marginRight: 11 },
  legendTitle: { color: '#1b2b32', fontSize: 18, fontWeight: '800' },
  legendDetail: { color: '#59665f', fontSize: 16, marginTop: 4 },
  legendPositive: { color: '#1d7b36', fontSize: 16, fontWeight: '800', marginTop: 4 },
  legendWarning: { color: '#985307', fontSize: 16, fontWeight: '800', marginTop: 4 },
  reliability: { minHeight: 58, borderRadius: 14, backgroundColor: '#e5f5fc', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  reliabilityIcon: { color: '#14742d', fontSize: 25, marginRight: 10 },
  reliabilityText: { color: '#46534d', fontSize: 17, flex: 1 },
  reliabilityGreen: { color: '#197633' },
  reliabilityArrow: { color: '#54635d', fontSize: 32 },
  nextInbound: { minHeight: 116, borderRadius: 20, backgroundColor: '#fff', marginTop: 18, padding: 20, flexDirection: 'row', alignItems: 'center', shadowColor: '#52727e', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  inboundIcon: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#d8c8a7', color: '#fff', fontSize: 35, textAlign: 'center', textAlignVertical: 'center' },
  inboundDetails: { flex: 1, marginLeft: 14 },
  inboundTitle: { color: '#17272f', fontSize: 20, fontWeight: '800' },
  inboundText: { color: '#59665f', fontSize: 17, marginTop: 4 },
  verifyButton: { backgroundColor: '#9afa9b', borderRadius: 14, paddingHorizontal: 17, paddingVertical: 13 },
  verifyText: { color: '#197633', fontSize: 18, fontWeight: '800' },
  inventoryHeader: {
    height: 72, marginHorizontal: -16, paddingHorizontal: 20, backgroundColor: '#e8f8ef',
    borderBottomWidth: 1, borderBottomColor: '#e3ebef', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  inventoryBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 'auto' },
  inventoryTitle: { color: '#13252e', fontSize: 28, fontWeight: '800' },
  inventorySummary: { minHeight: 108, borderRadius: 17, backgroundColor: '#fff', marginTop: 20, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#57816a', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  inventorySummaryTitle: { color: '#17272f', fontSize: 21, fontWeight: '800' },
  inventorySummarySub: { color: '#57645c', fontSize: 14, marginTop: 6 },
  addProduct: { backgroundColor: '#2e8b32', borderRadius: 22, paddingHorizontal: 15, paddingVertical: 11 },
  addProductText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  inventoryTabs: { flexDirection: 'row', gap: 8, marginTop: 23 },
  inventoryTab: { flex: 1, minHeight: 60, borderRadius: 31, backgroundColor: '#e2f2fa', alignItems: 'center', justifyContent: 'center' },
  activeInventoryTab: { backgroundColor: '#2e8b32' },
  inventoryTabText: { color: '#1e3038', fontSize: 18, fontWeight: '800' },
  activeInventoryTabText: { color: '#fff' },
  inventorySearch: { height: 86, borderRadius: 20, backgroundColor: '#fff', marginTop: 24, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', shadowColor: '#52727e', shadowOpacity: 0.06, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  searchIcon: { color: '#758278', fontSize: 43, marginRight: 14, lineHeight: 43 },
  searchInput: { flex: 1, color: '#27383e', fontSize: 19 },
  productCard: { backgroundColor: '#fff', borderRadius: 20, marginTop: 20, padding: 22, shadowColor: '#52727e', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  productTop: { flexDirection: 'row', alignItems: 'center' },
  productImage: { width: 72, height: 72, borderRadius: 15, backgroundColor: '#d8f4df', alignItems: 'center', justifyContent: 'center' },
  riceImage: { backgroundColor: '#e5f2e9' },
  teaImage: { backgroundColor: '#d0edd8' },
  productImageText: { color: '#237b36', fontSize: 18, fontWeight: '900' },
  productDetails: { flex: 1, marginLeft: 15 },
  productName: { color: '#17272f', fontSize: 25, fontWeight: '800' },
  productDescription: { color: '#56645e', fontSize: 17, lineHeight: 24, marginTop: 3 },
  switch: { width: 78, height: 44, borderRadius: 24, padding: 4, justifyContent: 'center' },
  switchOn: { backgroundColor: '#2e8b32', alignItems: 'flex-end' },
  switchOff: { backgroundColor: '#dbe9f0', alignItems: 'flex-start' },
  switchKnob: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff' },
  stockPrice: { minHeight: 92, borderRadius: 14, backgroundColor: '#e5f5fc', marginTop: 15, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between' },
  stockHeading: { color: '#536057', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  stockUnits: { color: '#1c3038', fontSize: 22, fontWeight: '800', marginTop: 4 },
  outOfStock: { color: '#c52222' },
  priceHeading: { textAlign: 'right' },
  priceValue: { color: '#14752d', fontSize: 22, fontWeight: '800', marginTop: 4 },
  priceUnavailable: { color: '#1c3038' },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  availability: { color: '#197633', fontSize: 20, fontWeight: '700' },
  unavailable: { color: '#59645e' },
  productActions: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  editAction: { color: '#536057', fontSize: 20, fontWeight: '800' },
  shareAction: { color: '#536057', fontSize: 30, fontWeight: '800' },
  scanBanner: { minHeight: 112, borderRadius: 20, backgroundColor: '#c9f9d0', marginTop: 22, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  scanIcon: { width: 58, height: 58, borderRadius: 30, backgroundColor: '#9af59b', alignItems: 'center', justifyContent: 'center' },
  scanIconText: { color: '#18752f', fontSize: 27 },
  scanDetails: { flex: 1, marginLeft: 14 },
  scanTitle: { color: '#1d3036', fontSize: 20, fontWeight: '800' },
  scanSubtitle: { color: '#5a6960', fontSize: 16, marginTop: 4 },
  qrCode: { color: '#18752f', fontSize: 38 },
  notificationHeader: {
    height: 72, marginHorizontal: -16, paddingHorizontal: 20, backgroundColor: '#e8f8ef',
    borderBottomWidth: 1, borderBottomColor: '#e3ebef', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  notificationBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 'auto' },
  notificationTitle: { color: '#13252e', fontSize: 28, fontWeight: '800' },
  notificationSummary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 14 },
  newCount: { color: '#fff', backgroundColor: '#2c8738', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, fontSize: 18, fontWeight: '800' },
  realtime: { color: '#536057', fontSize: 18, flex: 1 },
  markRead: { color: '#2e8b32', fontSize: 18, fontWeight: '800' },
  notificationFilters: { gap: 8, paddingBottom: 18 },
  notificationFilter: { minWidth: 78, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  activeNotificationFilter: { backgroundColor: '#2e8b32' },
  notificationFilterText: { color: '#24343b', fontSize: 14, fontWeight: '800' },
  activeNotificationFilterText: { color: '#fff' },
  notificationCard: { minHeight: 120, borderRadius: 17, backgroundColor: '#fff', padding: 14, marginBottom: 14, flexDirection: 'row', shadowColor: '#57816a', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  notificationIcon: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#e7f1ea', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  notificationWarningIcon: { backgroundColor: '#ffddbf' },
  notificationSuccessIcon: { backgroundColor: '#9af59b' },
  notificationIconText: { color: '#14752d', fontSize: 34, fontWeight: '800' },
  notificationDetails: { flex: 1 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  notificationNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  unreadDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#2e8b32', marginRight: 8 },
  notificationCardTitle: { color: '#17272f', fontSize: 18, fontWeight: '800', flexShrink: 1 },
  notificationTime: { color: '#58645d', fontSize: 17, marginLeft: 8 },
  notificationDetail: { color: '#56645e', fontSize: 14, lineHeight: 20, marginTop: 6 },
  notificationAction: { alignSelf: 'flex-start', color: '#177732', backgroundColor: '#b9f6b8', borderRadius: 7, paddingHorizontal: 12, paddingVertical: 6, fontSize: 17, fontWeight: '800', marginTop: 11 },
  notificationWarningText: { color: '#95520a', backgroundColor: 'transparent' },
  notificationSuccessText: { color: '#197633', backgroundColor: 'transparent' },
  settingsHeader: {
    height: 72, marginHorizontal: -16, paddingHorizontal: 20, backgroundColor: '#e8f8ef',
    borderBottomWidth: 1, borderBottomColor: '#e3ebef', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  settingsBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 'auto' },
  settingsTitle: { color: '#13252e', fontSize: 28, fontWeight: '800' },
  shopHero: { minHeight: 178, marginTop: 14, borderRadius: 20, backgroundColor: '#d8f4df', padding: 22, flexDirection: 'row', alignItems: 'flex-end' },
  shopHeroIcon: { width: 64, height: 64, borderRadius: 14, backgroundColor: '#fff', color: '#197638', fontSize: 35, textAlign: 'center', textAlignVertical: 'center' },
  shopHeroDetails: { flex: 1, marginLeft: 14 },
  shopHeroName: { color: '#18251e', fontSize: 25, fontWeight: '800' },
  shopHeroSub: { color: '#52705c', fontSize: 17, marginTop: 2 },
  liveBadge: { color: '#197735', backgroundColor: '#9afa9b', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 7, fontSize: 17, fontWeight: '800' },
  settingsPanel: { backgroundColor: '#fff', borderRadius: 17, padding: 16, marginTop: 14, shadowColor: '#57816a', shadowOpacity: 0.07, shadowRadius: 7, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  settingsSectionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  sectionIcon: { color: '#14742e', fontSize: 25, marginRight: 8 },
  settingsPanelTitle: { color: '#17272f', fontSize: 21, fontWeight: '800' },
  publicDetails: { color: '#7b867c', fontSize: 16, fontWeight: '700', marginLeft: 'auto' },
  editSchedule: { color: '#197633', fontSize: 17, fontWeight: '800', marginLeft: 'auto' },
  settingFieldWrap: { marginBottom: 15 },
  settingFieldLabel: { color: '#4d5a52', fontSize: 18, fontWeight: '700', marginBottom: 7 },
  settingField: { minHeight: 54, borderRadius: 14, backgroundColor: '#e5f2e9', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  settingFieldValue: { color: '#263640', fontSize: 20, flex: 1 },
  settingFieldIcon: { color: '#738176', fontSize: 27 },
  hoursRow: { minHeight: 56, borderRadius: 14, backgroundColor: '#e5f2e9', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
  hoursRowClosed: { minHeight: 56, borderRadius: 14, backgroundColor: '#f0f7f1', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  greenDot: { color: '#127831', fontSize: 22, marginRight: 8 },
  grayDot: { color: '#7c877c', fontSize: 22, marginRight: 8 },
  hoursDay: { color: '#25343a', fontSize: 18, fontWeight: '800', marginRight: 18 },
  hoursTime: { color: '#25343a', fontSize: 18, fontWeight: '800' },
  pickupActive: { color: '#c9d5cf', fontSize: 16, marginLeft: 9 },
  closedBadge: { color: '#506057', backgroundColor: '#e0eef4', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 7, fontSize: 17, fontWeight: '800', marginLeft: 'auto' },
  hoursNote: { color: '#5c675e', fontSize: 17, lineHeight: 24, marginTop: 14 },
  policyLabel: { color: '#4d5a52', fontSize: 18, fontWeight: '700', marginBottom: 8, marginTop: 3 },
  policyBox: { color: '#263640', backgroundColor: '#e5f2e9', borderRadius: 14, padding: 15, fontSize: 16, lineHeight: 24 },
  policyNote: { color: '#7b867c', fontSize: 17, lineHeight: 24, marginVertical: 12 },
  saveButton: { minHeight: 56, borderRadius: 28, backgroundColor: '#2e8b32', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  userHeader: {
    minHeight: 96,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    backgroundColor: '#e8f8ef',
    borderBottomWidth: 1,
    borderBottomColor: '#e3ebef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 'auto' },
  userTitle: { color: '#13252e', fontSize: 27, lineHeight: 31, fontWeight: '800' },
  userTabs: {
    height: 52,
    marginTop: 14,
    padding: 6,
    borderRadius: 26,
    backgroundColor: '#e5f2e9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  activeUserTab: {
    height: '100%',
    minWidth: '34%',
    paddingHorizontal: 17,
    borderRadius: 22,
    backgroundColor: '#2e8b32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTabButton: {
    height: '100%',
    minWidth: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
  },
  activeUserTabText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  userTabText: { color: '#536057', fontSize: 14, fontWeight: '700' },
  actionHeading: { marginTop: 25, marginBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionTitle: { color: '#17272f', fontSize: 28, fontWeight: '800' },
  newBadge: { color: '#8a4d0d', backgroundColor: '#ffdcbc', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 5, fontSize: 17, fontWeight: '800' },
  reviewCount: { color: '#7a867e', fontSize: 17 },
  requestCard: {
    borderRadius: 17,
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#52727e',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  requestTop: { flexDirection: 'row', alignItems: 'flex-start' },
  requestAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#9af59b', alignItems: 'center', justifyContent: 'center' },
  orangeAvatar: { backgroundColor: '#ffddbf' },
  requestInitials: { color: '#237531', fontSize: 26, fontWeight: '800' },
  requestDetails: { flex: 1, marginLeft: 14 },
  requestName: { color: '#1b2b32', fontSize: 24, fontWeight: '800' },
  requestText: { color: '#56645e', fontSize: 18, marginTop: 3 },
  requestDate: { color: '#7b887f', fontSize: 16, marginTop: 11 },
  roleBadge: { color: '#4a5e58', backgroundColor: '#e5f2f8', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, fontSize: 17, fontWeight: '800' },
  vendorBadge: { color: '#8b4e0b', backgroundColor: '#ffddbf' },
  requestActions: { flexDirection: 'row', gap: 14, marginTop: 20 },
  approveButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: '#2e8737', alignItems: 'center', justifyContent: 'center' },
  approveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  rejectButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: '#e5f2e9', alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: '#4b5852', fontSize: 15, fontWeight: '800' },
  staffPanel: {
    backgroundColor: '#fff',
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: '#52727e',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  staffHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  staffTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  staffTitle: { color: '#17272f', fontSize: 21, fontWeight: '800' },
  teamBadge: { color: '#52615b', backgroundColor: '#e4f1f7', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 5, fontSize: 16, fontWeight: '800' },
  addStaff: { color: '#197732', fontSize: 18, fontWeight: '800' },
  staffMember: { minHeight: 78, borderBottomWidth: 1, borderBottomColor: '#dce8ed', flexDirection: 'row', alignItems: 'center' },
  staffAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#9af59b', alignItems: 'center', justifyContent: 'center' },
  mutedAvatar: { backgroundColor: '#d6e5ed' },
  staffInitials: { color: '#16752f', fontSize: 21, fontWeight: '800' },
  staffDetails: { flex: 1, marginLeft: 14 },
  staffName: { color: '#1b2b32', fontSize: 20, fontWeight: '800' },
  staffRole: { color: '#1b2b32', fontSize: 17, fontWeight: '800', marginTop: 2 },
  staffBullet: { color: '#526058' },
  staffAccess: { color: '#59655e', fontWeight: '400' },
  staffActions: { alignItems: 'flex-end', gap: 8, marginLeft: 8 },
  staffEditAction: { color: '#197732', fontSize: 15, fontWeight: '800' },
  staffDeleteAction: { color: '#b42318', fontSize: 15, fontWeight: '800' },
  staffForm: { borderTopWidth: 1, borderTopColor: '#dce8ed', borderBottomWidth: 1, borderBottomColor: '#dce8ed', paddingVertical: 12, marginBottom: 4 },
  staffPortalTabs: { flexDirection: 'row', gap: 6, marginVertical: 16 },
  staffPortalTab: { flex: 1, paddingVertical: 10, borderRadius: 18, backgroundColor: '#e5f2e9', alignItems: 'center' },
  activeStaffPortalTab: { backgroundColor: '#2e8b32' },
  staffPortalTabText: { color: '#52615b', fontWeight: '800', fontSize: 13 },
  activeStaffPortalTabText: { color: '#fff' },
  staffOrderCard: { borderTopWidth: 1, borderTopColor: '#dce8ed', paddingVertical: 14 },
  staffOrderTitle: { color: '#17272f', fontSize: 17, fontWeight: '800', marginBottom: 5 },
  staffOrderActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  staffCancelledBadge: { backgroundColor: '#ffd8d5', color: '#a32118' },
  staffStockRow: { minHeight: 76, borderTopWidth: 1, borderTopColor: '#dce8ed', flexDirection: 'row', alignItems: 'center', gap: 8 },
  staffPriceInput: { width: 90, borderWidth: 1, borderColor: '#cbd9d2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, color: '#1b2b32' },
  activeBadge: { color: '#257938', backgroundColor: '#b6f5b5', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 7, fontSize: 16, fontWeight: '800' },
  rolePermissions: { minHeight: 100, borderRadius: 18, backgroundColor: '#e5f5fc', marginTop: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  permissionIcon: { color: '#14752d', backgroundColor: '#fff', borderRadius: 12, padding: 13, fontSize: 28 },
  permissionDetails: { flex: 1, marginLeft: 15 },
  permissionTitle: { color: '#1b2b32', fontSize: 21, fontWeight: '800' },
  permissionSubtitle: { color: '#59665f', fontSize: 17, marginTop: 3 },
  permissionArrow: { color: '#34443d', fontSize: 38 },
  reportHeader: {
    height: 72,
    marginHorizontal: -16,
    paddingHorizontal: 20,
    backgroundColor: '#e8f8ef',
    borderBottomWidth: 1,
    borderBottomColor: '#e3ebef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportBack: { width: 42, alignItems: 'center' },
  reportBackText: { color: '#172a31', fontSize: 44, lineHeight: 44 },
  reportBrand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 'auto' },
  reportTitle: { color: '#13252e', fontSize: 28, fontWeight: '800' },
  reportTabs: {
    height: 76,
    marginTop: 16,
    padding: 6,
    borderRadius: 40,
    backgroundColor: '#dcebf4',
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeReportTab: {
    flex: 1,
    height: '100%',
    borderRadius: 34,
    backgroundColor: '#26343a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeReportTabText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  inactiveReportTab: { flex: 1, textAlign: 'center', color: '#4d5d54', fontSize: 21, fontWeight: '700' },
  reportStats: { flexDirection: 'row', gap: 8, marginTop: 26 },
  reportStat: {
    flex: 1,
    minHeight: 132,
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 14,
    shadowColor: '#52727e',
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reportStatTop: { flexDirection: 'row', justifyContent: 'space-between' },
  reportStatLabel: { color: '#6b756e', fontSize: 17 },
  reportStatIcon: { color: '#2c883d', fontSize: 24, fontWeight: '800' },
  reportStatValue: { color: '#17272f', fontSize: 29, fontWeight: '800', marginTop: 13 },
  reportStatNote: { color: '#197a33', fontSize: 18, fontWeight: '800', marginTop: 4 },
  reportPanel: {
    borderRadius: 17,
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 14,
    shadowColor: '#57816a',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reportPanelHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportPanelTitle: { color: '#16252d', fontSize: 21, fontWeight: '800' },
  reportPanelSubtitle: { color: '#68736c', fontSize: 14, marginTop: 3 },
  livePill: { backgroundColor: '#9afa9d', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9 },
  livePillText: { color: '#1b7b34', fontSize: 17, fontWeight: '800' },
  barChart: { height: 250, marginTop: 20, backgroundColor: '#e8f7fd', borderRadius: 16, paddingHorizontal: 48, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', position: 'relative' },
  chartLineOne: { position: 'absolute', left: 48, right: 20, top: 36, borderTopWidth: 1, borderColor: '#d6e8ed' },
  chartLineTwo: { position: 'absolute', left: 48, right: 20, top: 86, borderTopWidth: 1, borderColor: '#d6e8ed' },
  chartLineThree: { position: 'absolute', left: 48, right: 20, top: 136, borderTopWidth: 1, borderColor: '#d6e8ed' },
  barGroup: { height: 190, alignItems: 'center', justifyContent: 'flex-end', zIndex: 2 },
  reportBar: { width: 48, borderTopLeftRadius: 11, borderTopRightRadius: 11 },
  normalBar: { backgroundColor: '#26343a' },
  peakBar: { backgroundColor: '#7c8776' },
  peakLabel: { position: 'absolute', top: 0, color: '#14752f', fontSize: 17, fontWeight: '800' },
  barLabel: { color: '#46524c', fontSize: 16, marginTop: 10, width: 58, textAlign: 'center' },
  yAxis: { position: 'absolute', left: 12, color: '#9aa9a5', fontSize: 15, fontWeight: '700' },
  generateTitle: { color: '#14272e', fontSize: 27, fontWeight: '800', marginBottom: 24 },
  formHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  formLabel: { color: '#1b2b32', fontSize: 18, fontWeight: '800', marginBottom: 9 },
  setCurrent: { color: '#247837', fontSize: 17 },
  formField: { height: 54, borderRadius: 14, backgroundColor: '#e5f2e9', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 18 },
  formIcon: { color: '#7b8b84', fontSize: 27, marginRight: 14 },
  formValue: { color: '#23343b', fontSize: 20 },
  formChevron: { marginLeft: 'auto', color: '#718078', fontSize: 25 },
  generateButton: { height: 56, borderRadius: 28, backgroundColor: '#2e8b32', alignItems: 'center', justifyContent: 'center' },
  generateButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  recentHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  recentTitle: { color: '#1b2b32', fontSize: 23, fontWeight: '800' },
  today: { color: '#78847c', fontSize: 18 },
  fulfillment: { minHeight: 76, borderRadius: 14, backgroundColor: '#e8f7fd', padding: 10, flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  fulfillmentIcon: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#9cfa9b', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  routeIcon: { backgroundColor: '#ffddbe' },
  fulfillmentDetails: { flex: 1 },
  fulfillmentName: { color: '#1b2b32', fontSize: 17, fontWeight: '800' },
  fulfillmentDetail: { color: '#718078', fontSize: 15, marginTop: 3 },
  fulfillmentStatus: { color: '#177a32', backgroundColor: '#a5faa1', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, fontSize: 15, fontWeight: '800' },
  routeStatus: { color: '#fff', backgroundColor: '#b96a00' },
  header: {
    minHeight: 68,
    borderRadius: 34,
    backgroundColor: '#dedede',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  title: {
    color: '#090909',
    fontSize: 25,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roundButton: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#111',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3f3',
  },
  roundIcon: {
    fontSize: 32,
    lineHeight: 32,
    color: '#111',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderColor: '#111',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f3f3',
  },
  profileIcon: {
    fontSize: 30,
    lineHeight: 30,
    color: '#111',
  },
  profilePlus: {
    position: 'absolute',
    right: 3,
    bottom: 1,
    fontSize: 18,
    fontWeight: '800',
  },
  pickupCard: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 22,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  truck: {
    fontSize: 35,
    color: '#111',
  },
  pickupLabel: {
    fontSize: 24,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
  },
  pickupTime: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '800',
  },
  section: {
    borderWidth: 1,
    borderColor: '#111',
    borderRadius: 22,
    padding: 8,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginLeft: 8,
    marginBottom: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48.5%',
    minHeight: 174,
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    paddingVertical: 10,
  },
  metricIconBox: {
    width: 100,
    height: 92,
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricIcon: {
    color: '#555',
    fontSize: 68,
    lineHeight: 68,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 19,
    lineHeight: 23,
    color: '#111',
  },
  ordersButton: {
    backgroundColor: '#111',
    borderRadius: 18,
    minHeight: 56,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  ordersButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  arrow: {
    color: '#fff',
    fontSize: 30,
    marginLeft: 8,
    lineHeight: 30,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dedede',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 34,
    lineHeight: 34,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 44,
  },
  orderCard: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  orderMeta: {
    color: '#555',
    marginTop: 5,
  },
  ready: {
    color: '#19733a',
    fontWeight: '800',
  },
  processing: {
    color: '#a56c00',
    fontWeight: '800',
  },
});
