import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updatePassword,
  updateEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  deleteObject 
} from 'firebase/storage';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Query Builder for Firestore representing Supabase syntax
class QueryBuilder {
  private tableName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertData: any = null;
  private updateData: any = null;
  private filters: any[] = [];
  private orderParams: { field: string; ascending: boolean }[] = [];
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string) {
    this.action = 'select';
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.updateData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ type: 'neq', field, value });
    return this;
  }

  gt(field: string, value: any) {
    this.filters.push({ type: 'gt', field, value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ type: 'gte', field, value });
    return this;
  }

  lt(field: string, value: any) {
    this.filters.push({ type: 'lt', field, value });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ type: 'lte', field, value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ type: 'in', field, value: values });
    return this;
  }

  not(field: string, operator: string, value: any) {
    this.filters.push({ type: 'not', field, operator, value });
    return this;
  }

  or(filterString: string) {
    this.filters.push({ type: 'or', value: filterString });
    return this;
  }

  ilike(field: string, pattern: string) {
    this.filters.push({ type: 'ilike', field, value: pattern });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderParams.push({ field, ascending: options?.ascending ?? true });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    try {
      if (this.action === 'insert') {
        const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
        const inserted = [];
        for (const item of items) {
          const docId = item.id || crypto.randomUUID();
          const dataToWrite = { ...item, id: docId };
          const nowStr = new Date().toISOString();
          if (!dataToWrite.created_at) dataToWrite.created_at = nowStr;
          if (!dataToWrite.updated_at) dataToWrite.updated_at = nowStr;

          await setDoc(doc(db, this.tableName, docId), dataToWrite);
          inserted.push(dataToWrite);
        }
        
        const returnData = Array.isArray(this.insertData) ? inserted : inserted[0];
        if (this.isSingle) {
          return { data: inserted[0] || null, error: null };
        }
        return { data: returnData, error: null };
      }

      if (this.action === 'update') {
        const docs = await this.fetchAndFilterDocs();
        const updated = [];
        for (const d of docs) {
          const nowStr = new Date().toISOString();
          const docRef = doc(db, this.tableName, d.id);
          const updatePayload = { ...this.updateData, updated_at: nowStr };
          await updateDoc(docRef, updatePayload);
          updated.push({ ...d, ...updatePayload });
        }
        if (this.isSingle) {
          return { data: updated[0] || null, error: null };
        }
        return { data: updated, error: null };
      }

      if (this.action === 'delete') {
        const docs = await this.fetchAndFilterDocs();
        for (const d of docs) {
          await deleteDoc(doc(db, this.tableName, d.id));
        }
        return { data: docs, error: null };
      }

      // Default is select
      const docs = await this.fetchAndFilterDocs();
      
      if (this.isSingle) {
        if (docs.length === 0) {
          return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
        }
        return { data: docs[0], error: null };
      }
      
      if (this.isMaybeSingle) {
        return { data: docs[0] || null, error: null };
      }

      return { data: docs, error: null };

    } catch (error: any) {
      console.error(`Firestore error on collection ${this.tableName}:`, error);
      return { data: null, error };
    }
  }

  private async fetchAndFilterDocs(): Promise<any[]> {
    let docs: any[] = [];

    const idFilter = this.filters.find(f => f.type === 'eq' && f.field === 'id');
    const userIdFilter = this.filters.find(f => f.type === 'eq' && f.field === 'user_id');

    if (idFilter) {
      const docSnap = await getDoc(doc(db, this.tableName, idFilter.value));
      if (docSnap.exists()) {
        docs = [docSnap.data()];
      }
    } else if (userIdFilter) {
      const q = query(collection(db, this.tableName), where('user_id', '==', userIdFilter.value));
      const querySnap = await getDocs(q);
      querySnap.forEach(snap => {
        docs.push(snap.data());
      });
    } else {
      const querySnap = await getDocs(collection(db, this.tableName));
      querySnap.forEach(snap => {
        docs.push(snap.data());
      });
    }

    // Apply filters in memory
    for (const f of this.filters) {
      if (f.field === 'id' && idFilter) continue;
      if (f.field === 'user_id' && userIdFilter) continue;

      if (f.type === 'eq') {
        docs = docs.filter(d => d[f.field] === f.value);
      } else if (f.type === 'neq') {
        docs = docs.filter(d => d[f.field] !== f.value);
      } else if (f.type === 'gt') {
        docs = docs.filter(d => d[f.field] > f.value);
      } else if (f.type === 'gte') {
        docs = docs.filter(d => d[f.field] >= f.value);
      } else if (f.type === 'lt') {
        docs = docs.filter(d => d[f.field] < f.value);
      } else if (f.type === 'lte') {
        docs = docs.filter(d => d[f.field] <= f.value);
      } else if (f.type === 'in') {
        docs = docs.filter(d => Array.isArray(f.value) && f.value.includes(d[f.field]));
      } else if (f.type === 'not') {
        if (f.operator === 'is' && f.value === null) {
          docs = docs.filter(d => d[f.field] !== null && d[f.field] !== undefined);
        } else {
          docs = docs.filter(d => d[f.field] !== f.value);
        }
      } else if (f.type === 'ilike') {
        const searchPattern = String(f.value).replace(/%/g, '').toLowerCase();
        docs = docs.filter(d => d[f.field] && String(d[f.field]).toLowerCase().includes(searchPattern));
      } else if (f.type === 'or') {
        const parts = String(f.value).split(',');
        docs = docs.filter(d => {
          return parts.some(part => {
            const subparts = part.split('.');
            if (subparts.length >= 3) {
              const field = subparts[0];
              const op = subparts[1];
              const val = subparts.slice(2).join('.');
              if (op === 'eq') {
                return String(d[field]) === val;
              } else if (op === 'ilike') {
                const searchPattern = val.replace(/%/g, '').toLowerCase();
                return d[field] && String(d[field]).toLowerCase().includes(searchPattern);
              }
            }
            return false;
          });
        });
      }
    }

    // Apply sorting
    if (this.orderParams.length > 0) {
      docs.sort((a, b) => {
        for (const order of this.orderParams) {
          const valA = a[order.field];
          const valB = b[order.field];
          
          if (valA === valB) continue;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;

          const comparison = valA < valB ? -1 : 1;
          return order.ascending ? comparison : -comparison;
        }
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      docs = docs.slice(0, this.limitCount);
    }

    return docs;
  }
}

// Map Firebase User profile fields into standard format
const getProfileSession = async (user: FirebaseUser) => {
  const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
  const profileData = profileSnap.exists() ? profileSnap.data() : {};
  return {
    user: {
      id: user.uid,
      email: user.email || '',
      user_metadata: {
        full_name: profileData.full_name || user.displayName || '',
        avatar_url: profileData.avatar_url || '',
        ...profileData
      }
    },
    access_token: 'firebase_dummy_token',
    expires_at: 9999999999
  };
};

// Main shim client
export const supabase = {
  from(tableName: string) {
    return new QueryBuilder(tableName);
  },

  auth: {
    async getSession() {
      const user = auth.currentUser;
      if (user) {
        const session = await getProfileSession(user);
        return { data: { session }, error: null };
      }
      return { data: { session: null }, error: null };
    },

    async getUser() {
      const user = auth.currentUser;
      if (user) {
        const session = await getProfileSession(user);
        return { data: { user: session.user }, error: null };
      }
      return { data: { user: null }, error: new Error('No user logged in') };
    },

    async signInWithPassword({ email, password }: any) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const session = await getProfileSession(userCredential.user);
        return { data: { session, user: session.user }, error: null };
      } catch (error: any) {
        return { data: { session: null, user: null }, error };
      }
    },

    async signUp({ email, password, options }: any) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const fullName = options?.data?.full_name || '';
        const nowStr = new Date().toISOString();

        // Save profile
        const profileData = {
          id: crypto.randomUUID(),
          user_id: user.uid,
          full_name: fullName,
          avatar_url: null,
          timezone: 'Asia/Dhaka',
          currency: 'BDT',
          date_format: 'DD/MM/YYYY',
          created_at: nowStr,
          updated_at: nowStr,
          email: email
        };
        await setDoc(doc(db, 'profiles', user.uid), profileData);

        // Seed default budget categories (matches postgres trigger seed_default_categories)
        const defaultCategories = [
          { name: 'Salary', icon: 'Briefcase', color: '#22c55e', is_income: true },
          { name: 'Freelance', icon: 'Laptop', color: '#10b981', is_income: true },
          { name: 'Investment', icon: 'TrendingUp', color: '#06b6d4', is_income: true },
          { name: 'Food', icon: 'Utensils', color: '#f97316', is_income: false },
          { name: 'Transport', icon: 'Car', color: '#8b5cf6', is_income: false },
          { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', is_income: false },
          { name: 'Bills', icon: 'Receipt', color: '#ef4444', is_income: false },
          { name: 'Family', icon: 'Heart', color: '#f43f5e', is_income: false },
          { name: 'Health', icon: 'Activity', color: '#14b8a6', is_income: false },
          { name: 'Entertainment', icon: 'Gamepad2', color: '#a855f7', is_income: false },
          { name: 'Savings', icon: 'PiggyBank', color: '#22d3ee', is_income: false },
          { name: 'Other', icon: 'MoreHorizontal', color: '#6b7280', is_income: false }
        ];

        for (const cat of defaultCategories) {
          const catId = crypto.randomUUID();
          await setDoc(doc(db, 'budget_categories', catId), {
            id: catId,
            user_id: user.uid,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            is_income: cat.is_income,
            created_at: nowStr,
            updated_at: nowStr
          });
        }

        const session = {
          user: {
            id: user.uid,
            email: user.email || '',
            user_metadata: {
              full_name: fullName
            }
          },
          access_token: 'firebase_dummy_token',
          expires_at: 9999999999
        };
        return { data: { session, user: session.user }, error: null };
      } catch (error: any) {
        return { data: { session: null, user: null }, error };
      }
    },

    async signOut() {
      await firebaseSignOut(auth);
      return { error: null };
    },

    async updateUser(attributes: any) {
      const user = auth.currentUser;
      if (!user) return { error: new Error('No user logged in') };
      try {
        if (attributes.password) {
          await updatePassword(user, attributes.password);
        }
        if (attributes.email) {
          await updateEmail(user, attributes.email);
        }
        if (attributes.data) {
          const userRef = doc(db, 'profiles', user.uid);
          await updateDoc(userRef, attributes.data);
        }
        const session = await getProfileSession(user);
        return { data: { user: session.user }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },

    async reauthenticate() {
      // Dummy verification method; handled by subsequent signInWithPassword
      return { error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const session = await getProfileSession(user);
          callback('SIGNED_IN', session);
        } else {
          callback('SIGNED_OUT', null);
        }
      });

      return {
        data: {
          subscription: {
            unsubscribe
          }
        }
      };
    },

    mfa: {
      async listFactors() {
        return { data: { all: [], totp: [] }, error: null };
      },
      async getAuthenticatorAssuranceLevel() {
        return { data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null };
      },
      async enroll() {
        return { data: { id: 'dummy-id', type: 'totp', totp: { qr_code: '', secret: '', uri: '' } }, error: null };
      },
      async challenge() {
        return { data: { id: 'dummy-challenge-id' }, error: null };
      },
      async verify() {
        return { data: null, error: null };
      },
      async unenroll() {
        return { data: null, error: null };
      }
    }
  },

  storage: {
    from(bucketName: string) {
      return {
        async upload(path: string, file: File, options?: any) {
          try {
            const fileRef = ref(storage, `${bucketName}/${path}`);
            await uploadBytes(fileRef, file);
            return { data: { path }, error: null };
          } catch (error: any) {
            return { data: null, error };
          }
        },

        getPublicUrl(path: string) {
          const bucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'amp-lifeos.firebasestorage.app';
          const encodedPath = encodeURIComponent(`${bucketName}/${path}`);
          const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
          return { data: { publicUrl } };
        },

        async remove(paths: string[]) {
          try {
            for (let path of paths) {
              if (path.includes('firebasestorage.googleapis.com')) {
                const decoded = decodeURIComponent(path);
                const match = decoded.match(/\/o\/([^\?]+)/);
                if (match) {
                  path = match[1];
                }
              }
              let cleanPath = path;
              if (cleanPath.startsWith(`${bucketName}/`)) {
                cleanPath = cleanPath.substring(bucketName.length + 1);
              }
              const fileRef = ref(storage, `${bucketName}/${cleanPath}`);
              await deleteObject(fileRef);
            }
            return { data: paths, error: null };
          } catch (error: any) {
            return { data: null, error };
          }
        }
      };
    }
  },

  async rpc(funcName: string, args?: any) {
    try {
      if (funcName === 'increment_product_analytics_counter') {
        const user = auth.currentUser;
        if (!user) throw new Error('Unauthenticated');
        
        const eventKey = args.p_event_key;
        const metricDate = args.p_metric_date;
        const increment = args.p_increment || 1;
        const source = args.p_source || 'web';

        // Check if row already exists
        const querySnap = await getDocs(query(
          collection(db, 'product_analytics_daily'),
          where('user_id', '==', user.uid),
          where('metric_date', '==', metricDate),
          where('event_key', '==', eventKey)
        ));

        let analyticsRow: any = null;
        const nowStr = new Date().toISOString();

        if (!querySnap.empty) {
          const docSnap = querySnap.docs[0];
          const currentData = docSnap.data();
          const newCount = (currentData.event_count || 0) + increment;
          analyticsRow = {
            ...currentData,
            event_count: newCount,
            source,
            updated_at: nowStr
          };
          await updateDoc(doc(db, 'product_analytics_daily', docSnap.id), analyticsRow);
        } else {
          const newId = crypto.randomUUID();
          analyticsRow = {
            id: newId,
            user_id: user.uid,
            metric_date: metricDate,
            event_key: eventKey,
            event_count: increment,
            source,
            created_at: nowStr,
            updated_at: nowStr
          };
          await setDoc(doc(db, 'product_analytics_daily', newId), analyticsRow);
        }

        return { data: analyticsRow, error: null };
      }

      if (funcName === 'get_support_users_safe') {
        const querySnap = await getDocs(collection(db, 'support_users'));
        const users: any[] = [];
        querySnap.forEach(snap => {
          const data = snap.data();
          // Remove password fields for security
          const { extension_password, mail_password, nas_password, ...safeData } = data;
          users.push(safeData);
        });

        // Sort by name
        users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return { data: users, error: null };
      }

      throw new Error(`RPC function ${funcName} not supported in Firebase shim`);
    } catch (error: any) {
      console.error(`Firebase RPC error for ${funcName}:`, error);
      return { data: null, error };
    }
  }
};