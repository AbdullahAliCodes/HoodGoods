
# 🛍️ HoodGoods – Local Artisan Marketplace

🌐 **Live Website**: [https://victorious-mud-0224f2003.6.azurestaticapps.net](https://victorious-mud-0224f2003.6.azurestaticapps.net/)

**HoodGoods** is a full-stack web application designed to connect local artisans with buyers through a curated digital marketplace. Built with user-first design, secure authentication, and robust e-commerce features, HoodGoods empowers small business owners to showcase and manage their products online.

---

## 👥 Contributors

| Name                | Student Number |
|---------------------|----------------|
| Abdullah Ali        | 2309318        |
| Ahmed Nanabhai      | 2450939        |
| Kaylan Gokal        | 2724001        |
| Shervaan Govinder   | 2556996        |
| Muzzammil Soofie    | 2731823        |
| Jaishil Patel       | 2602867        |

- Built as part of a full-stack software engineering course over 4 sprints
- Mentored by faculty and supported with client interaction & feedback loops

---

## 📌 Project Overview

HoodGoods provides an intuitive and seamless experience for:

- **Buyers**: Discover, filter, and purchase handcrafted goods from various artisans.
- **Sellers**: Set up their own store, list products, manage inventory, and fulfill orders.
- **Admins** *(upcoming)*: Oversee the platform and ensure quality control and smooth operations.

---

## 🚀 Key Features

### 👤 Authentication
- Third-party login via Auth0
- Role-based redirection (Buyer/Seller)

### 🛒 Marketplace & Cart
- Browse shops and product listings
- Add items to cart and modify quantities
- Multi-vendor grouped checkout with delivery options

### 🛍️ Seller Tools
- Create and manage store listings
- Set product details, stock levels, and delivery options
- Automatic inventory adjustments post-purchase
- Order management with real-time status updates

### 📦 Buyer Experience
- Search products via keywords
- Filter listings by categories
- Track order history and view fulfillment status

---

## 🧠 Architecture

- **Frontend**: React + Vite
- **Backend**: NestJS (Node.js / Express)
- **Authentication**: Auth0
- **Database**: Supabase
- **CI/CD & Deployment**: GitHub Actions + Azure

### 📊 Diagrams
UML Diagrams included:
- Use Case Diagram
- Class Diagram
- Sequence Diagram
- Component Diagram
- Activity Diagram
- State Diagram
- Deployment Diagram

---

## 📅 Project Timeline

- **Sprint 1**: Initial setup, login/signup, store browsing, and cart basics
- **Sprint 2**: Seller store creation, inventory management, product display, and filters
- **Sprint 3**: Advanced checkout, order tracking, fulfillment, and automated logic

---

## 🤝 Acknowledgments

Special thanks to:
- Our client for continuous feedback and direction
- The Wits University CS department
- Our fellow teammates and mentors

---

---

## 🛠️ Getting Started

Follow these steps to set up the HoodGoods project locally:

### 1. Install Prerequisites
Ensure you have the following installed:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (check with `node -v`)
- [Bruno (API testing tool)](https://www.usebruno.com/downloads)

### 2. Set Up Git and SSH
If you're using Git Bash:
```bash
# Configure Git (only if not done yet)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Generate SSH key
ssh-keygen -t ed25519 -C "you@example.com"
```
Then add the public key to your GitHub SSH settings.

### 3. Clone the Repository
```bash
git clone git@github.com:MuzzammilWits/HoodGoods.git
cd HoodGoods
ls
```
You should see folders: `backend`, `frontend`, and `brunoAPI`.

---

### ▶️ Run the Application

#### 🔧 Backend Setup
```bash
cd backend
npm i -g @nestjs/cli
npm install
nest start
```
Open [http://localhost:3000](http://localhost:3000). If it says `Hello World!`, your backend is working.

Use `Ctrl + C` to stop the server, then:
```bash
cd ..
```

---

#### 💻 Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Visit [http://localhost:5173](http://localhost:5173). You should see a Vite + React page with a counter.

Stop the server using `Ctrl + C` and return:
```bash
cd ..
```

---

🎉 Your setup is complete!

---

*Support your local creators. Support your community. Support HoodGoods.*
