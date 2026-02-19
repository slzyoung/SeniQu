# Feature Specifications

This document outlines the core public and private features of the application.

## 1. Public Features
Accessible to all visitors.

### 1.1 Landing Page
- **Hero Section**: High-impact visual intro.
- **Featured Collections**: Curated grid of artworks.
- **Stats Bar**: Social proof metrics.
- **Search**: Global search overlay.
- **Mobile Notifications**: Real-time alerts with read/unread status and push notification support.

### 1.2 Gallery Module
- **Public Gallery**: Browsable grid of all public artworks with filtering (Genre, Medium, Price).
- **Museum Detail**: Dedicated page for institutions to showcase their collections, exhibition hours, and location.
- **Artwork View**: Deep-dive into a single artwork with high-res zoom, provenance, and "More like this" AI suggestions.

### 1.3 Marketplace
- **NFT Browsing**: List of tradable assets.
- **Purchase Flow**: Buy-now or Auction bidding interface.
- **Wallet Connection**: Web3 wallet integration.

### 1.4 Community
- **Forums**: Discussion boards categorized by topic.
- **Threads**: Threaded conversations with rich text.

### 1.5 AI Tools
- **Genre Identifier**: Upload an image to detect style/genre using ML.
- **AI Curation**: Personalized recommendations engine.

## 2. User/Collector Dashboard
For `USER` and `COLLECTOR` roles.
- **Overview**: Stats on viewed/collected items.
- **My Collections**: Group bookmarks into custom lists.
- **Bookmarks**: Saved artworks.
- **Bookmarks**: Saved artworks.
- **Settings Page**:
  - **Profile Management**: Update avatar, bio, and personal details.
  - **Security**: Toggle 2FA and Login Alerts.
  - **Notifications**: Configure email and push preferences (JSONB persistence).
  - **Theme**: Dark/Light mode toggle.
- **Profile/Settings**: Account management.

## 3. Artist/Institution Dashboard
For `ARTIST` and `INSTITUTION` roles.
- **Upload Wizard**: Multi-step form to publish art.
- **My Artworks**: Table/Grid management of portfolio.
- **Analytics**:
  - Views & Likes time-series charts (Recharts).
  - Geographic distribution of visitors.
  - Engagement metrics.
- **Performance**: Sales data and revenue tracking.

## 4. Admin Dashboard
For `ADMIN` and `SUPER_ADMIN`.
- **System Overview**: Health status, user growth charts.
- **User Management**: Ban/Verify users.
- **Institution Approval**: Workflow to verify new museums.
- **Content Moderation**: Review reported artworks/comments.
- **System Logs**: View backend error/access logs.
- **Security Center**: Threat monitoring.
