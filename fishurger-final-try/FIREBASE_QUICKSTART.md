# Firebase Quick Reference

## 🚀 Quick Start

1. **Start Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Open Demo Pages**:
   - Menu: http://localhost:3000/menu-component.html
   - Orders: http://localhost:3000/order-placement-example.html
   - Kitchen (Firebase): http://localhost:3000/kitchen-dashboard-firebase.html

3. **Set Up Firestore** (First Time):
   - Go to https://console.firebase.google.com/project/fishburger-system/firestore
   - Create collection: `menu_items`
   - Add sample items (see structure below)

---

## 📊 Firestore Collections

### `menu_items`
```json
{
  "name": "Crispy Fish Burger",
  "description": "Crispy white fish with chipotle sauce",
  "price": 95,
  "category": "burgers",
  "available": true
}
```

### `orders`
```json
{
  "customer": {
    "name": "John Doe",
    "phone": "+212 6XX XXX XXX",
    "address": "123 Main St"
  },
  "items": [
    {
      "name": "Crispy Fish Burger",
      "price": 95,
      "quantity": 2
    }
  ],
  "total": 190,
  "location": "rooftop",
  "status": "pending"
}
```

**Status Flow**: `pending` → `preparing` → `ready` → `out-for-delivery` → `completed`

---

## 🔥 Real-Time Features

### Menu Component
- Auto-updates when menu changes in Firestore
- No refresh needed
- Uses `onSnapshot()` listener

### Kitchen Dashboard
- Orders appear instantly when placed
- Status updates sync across all devices
- No polling - pure real-time

---

## 📝 Code Examples

### Fetch Menu (Real-Time)
```javascript
import { collection, onSnapshot } from 'firebase/firestore';

onSnapshot(collection(db, "menu_items"), (snapshot) => {
  const items = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  displayMenu(items);
});
```

### Place Order
```javascript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

await addDoc(collection(db, 'orders'), {
  customer: { name, phone, address },
  items: [...],
  total: 190,
  location: "rooftop",
  status: "pending",
  timestamp: serverTimestamp()
});
```

### Update Order Status
```javascript
import { doc, updateDoc } from 'firebase/firestore';

await updateDoc(doc(db, 'orders', orderId), {
  status: 'preparing'
});
```

---

## 🎯 Testing Workflow

1. Open kitchen dashboard (Firebase version)
2. Open order placement page in another tab
3. Place a test order
4. **Watch it appear instantly in kitchen dashboard!**
5. Click "Start Preparing" → moves to Preparing column
6. Click "Mark as Ready" → disappears (status = 'ready')

---

## 📦 Files Created

- `menu-component.html` - Real-time menu demo
- `order-placement-example.html` - Order creation
- `kitchen-dashboard-firebase.html` - Real-time kitchen dashboard

---

## ⚠️ Important Notes

- **Free Tier Limits**: 50K reads/day, 20K writes/day
- **Security**: Currently in test mode - add security rules before production
- **Hybrid Approach**: Firebase for real-time + Express for analytics

---

## 🔗 Useful Links

- [Firestore Console](https://console.firebase.google.com/project/fishburger-system/firestore)
- [Usage Dashboard](https://console.firebase.google.com/project/fishburger-system/usage)
- [Firebase Docs](https://firebase.google.com/docs/firestore)
