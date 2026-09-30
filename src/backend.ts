import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        storage: {
          getItem: (key) => AsyncStorage.getItem(key),
          setItem: (key, value) => AsyncStorage.setItem(key, value),
          removeItem: (key) => AsyncStorage.removeItem(key),
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

const localKey = (key: string) => `owner-app:${key}`;

export type OwnerCollectionName =
  | 'products'
  | 'orders'
  | 'pendingRequests'
  | 'staff'
  | 'suppliers'
  | 'messages'
  | 'supplierProfiles'
  | 'supplierProducts'
  | 'supplyOrders'
  | 'supplierMessages';

export type SupplierStatus = 'Pending' | 'Verified' | 'Rejected';

export type SupplierProfile = {
  id: string;
  email: string;
  phone: string;
  address: string;
  idNumber: string;
  businessName: string;
  registrationImage: string;
  password?: string;
  status: SupplierStatus;
  createdAt: string;
};

export type SupplierProduct = {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  image: string;
  price: string;
  description: string;
  stock: number;
  active: boolean;
  updatedAt: string;
};

export type SupplyOrderStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Received';
export type SupplyOrder = {
  id: string;
  supplierId: string;
  supplierName: string;
  buyer: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: string;
  status: SupplyOrderStatus;
  date: string;
  receivedStock?: number;
  receivedDetails?: string;
};

export type SupplierMessage = {
  id: string;
  from: string;
  to: string;
  body: string;
  date: string;
  read: boolean;
};

export async function loadOwnerCollection<T>(name: OwnerCollectionName, fallback: T): Promise<T> {
  const saved = await AsyncStorage.getItem(localKey(name));
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export async function saveOwnerCollection<T>(name: OwnerCollectionName, value: T): Promise<void> {
  await AsyncStorage.setItem(localKey(name), JSON.stringify(value));
}

export async function registerSupplier(profile: SupplierProfile): Promise<void> {
  const profiles = await loadOwnerCollection<SupplierProfile[]>('supplierProfiles', []);
  if (profiles.some((item) => item.email.toLowerCase() === profile.email.toLowerCase())) {
    throw new Error('A supplier account with this email already exists.');
  }
  await saveOwnerCollection('supplierProfiles', [...profiles, profile]);
  const suppliers = await loadOwnerCollection<Array<{ initials: string; name: string; category: string; status: string }>>('suppliers', []);
  await saveOwnerCollection('suppliers', [
    ...suppliers,
    {
      initials: profile.businessName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      name: profile.businessName,
      category: 'Supplier',
      status: profile.status,
    },
  ]);
}

export async function signInSupplier(email: string, password: string): Promise<SupplierProfile> {
  const profiles = await loadOwnerCollection<SupplierProfile[]>('supplierProfiles', []);
  const profile = profiles.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (!profile && email.toLowerCase() === 'supplier@greenlinemart.lk' && password === 'supplier1234') {
    const demoProfile: SupplierProfile = {
      id: 'SUP-DEMO-001',
      email: 'supplier@greenlinemart.lk',
      phone: '0771234567',
      address: 'Greenline Supplier Hub',
      idNumber: 'SUP-DEMO-001',
      businessName: 'Greenline Fresh Suppliers',
      registrationImage: 'demo-registration.jpg',
      password: 'supplier1234',
      status: 'Verified',
      createdAt: new Date().toISOString(),
    };
    await saveOwnerCollection('supplierProfiles', [...profiles, demoProfile]);
    await AsyncStorage.setItem(localKey('supplier-signed-in'), demoProfile.id);
    return demoProfile;
  }
  if (!profile || profile.password !== password) {
    throw new Error('Supplier account not found or password is incorrect.');
  }
  await AsyncStorage.setItem(localKey('supplier-signed-in'), profile.id);
  return profile;
}

export async function signOutSupplier(): Promise<void> {
  await AsyncStorage.removeItem(localKey('supplier-signed-in'));
}

export async function signInOwner(email: string, password: string): Promise<void> {
  if (!supabase) {
    if (email !== 'owner@greenlinemart.lk') {
      throw new Error('Use the demo owner email or configure Supabase credentials.');
    }
    await AsyncStorage.setItem(localKey('signed-in'), 'true');
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOutOwner(): Promise<void> {
  await AsyncStorage.removeItem(localKey('signed-in'));
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('New password must contain at least 8 characters.');
  }
  if (!supabase) {
    const storedPassword = await AsyncStorage.getItem(localKey('customer-password'));
    if (storedPassword && storedPassword !== currentPassword) {
      throw new Error('Current password is incorrect.');
    }
    await AsyncStorage.setItem(localKey('customer-password'), newPassword);
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function deleteCustomerAccount(): Promise<void> {
  await AsyncStorage.removeItem(localKey('customer-password'));
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
}

export async function saveOwnerSettings(settings: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(localKey('settings'), JSON.stringify(settings));
  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { error } = await supabase.from('owner_settings').upsert({
        owner_id: userData.user.id,
        settings,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }
  }
}

export async function loadOwnerSettings(): Promise<Record<string, string> | null> {
  const saved = await AsyncStorage.getItem(localKey('settings'));
  if (saved) return JSON.parse(saved) as Record<string, string>;

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data, error } = await supabase
        .from('owner_settings')
        .select('settings')
        .eq('owner_id', userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.settings as Record<string, string> | undefined) ?? null;
    }
  }
  return null;
}
