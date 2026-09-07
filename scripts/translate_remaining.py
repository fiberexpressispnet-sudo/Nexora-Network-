import re
import os
import glob

# Comprehensive replacements for each specific file
replacements = {
    "src/components/pages/RevenueTracker.tsx": [
        ("প্রতিদিনের ক্লায়েন্ট অ্যাক্টিভেশন ও রিচার্জের লাইভ অটোমেটিক গ্রাফ, ইনকাম সোর্স লিস্ট এবং ১২ মাসের ইতিহাস দেখুন।",
         "View daily client activations, live automatic recharge graphs, income sources, and 12-month transaction history."),
        ("আপনি কি নিশ্চিত যে সমস্ত বিলিং ও পেমেন্ট হিস্ট্রি ডাটা চিরতরে মুছে ফেলতে চান? (Hard Reset)",
         "Are you sure you want to permanently clear all billing & payment history data? (Hard Reset)"),
        ("➕ নতুন রিচার্জ এন্ট্রি করুন", "➕ Record New Recharge"),
        ("CSV এক্সপোর্ট", "Export CSV"),
        ("📊 চলতি মাসের লাইভ আয়", "📊 Current Month Revenue"),
        ("🗓️ ১ বছরের রেকর্ড আর্কাইভ (12 Months History)", "🗓️ 1-Year Archive (12 Months History)"),
        ("📋 অল-টাইম ট্রানজেকশন হিস্ট্রি", "📋 All-Time Transaction History"),
        ("চলতি মাসের মোট আয়", "Current Month Gross Revenue"),
        ("মোট সংগৃহীত বিল", "Total Collected Bill"),
        ("মোট ক্লায়েন্ট রিচার্জ", "Total Subscriber Recharges"),
        ("সর্বোচ্চ রিচার্জের দিন", "Peak Recharge Day"),
        ("টাকার পরিমাণ", "Amount"),
        ("পেমেন্ট মাধ্যম", "Payment Method"),
        ("গ্রাহকের নাম ও আইডি", "Subscriber Name & ID"),
        ("তারিখ ও সময়", "Date & Time"),
        ("রিসিট নম্বর", "Receipt No"),
        ("নোট", "Note"),
        ("অ্যাকশন", "Actions"),
        ("রিচার্জ হিস্ট্রি", "Recharge History"),
        ("টাকা", "BDT"),
        ("লাইভ রিচার্জ ও দৈনিক কালেকশন গ্রাফ", "Live Recharge & Daily Collections Graph"),
        ("ক্যাশ", "Cash"),
        ("বিকাশ", "bKash"),
        ("নগদ", "Nagad"),
        ("রকেট", "Rocket"),
        ("ব্যাংক", "Bank"),
        ("বিবরণ", "Details"),
        ("রিচার্জ যোগ করুন", "Add Recharge"),
        ("অনুগ্রহ করে সকল তথ্য পূরণ করুন", "Please fill in all details"),
        ("নতুন রিচার্জ যোগ করুন", "Add New Recharge Payment"),
        ("গ্রাহক নির্বাচন করুন", "Select Subscriber"),
        ("কাস্টম ক্লায়েন্ট নাম", "Custom Client Name"),
        ("রিচার্জ প্যাকেজ", "Recharge Package"),
        ("সংরক্ষণ করুন", "Save Payment"),
        ("বাতিল", "Cancel"),
        ("ফিল্টার করুন", "Filter"),
        ("অনুসন্ধান করুন...", "Search by subscriber name, user ID, phone, or transaction ID..."),
        ("মাসিক আয় বিবরণী", "Monthly Revenue Breakdown"),
        ("বছর", "Year"),
        ("মাস", "Month"),
        ("মোট ট্রানজেকশন", "Total Transactions"),
        ("গড় দৈনিক আয়", "Avg Daily Income"),
        ("পেমেন্ট গেটওয়ে সামারি", "Payment Gateway Summary"),
    ],
    "src/components/pages/MikrotikManagement.tsx": [
        ("যে কোনো মাইক্রোটিক রাউটারে ক্লিক করে সেটির ইন্টারফেস, ট্রাফিক এবং ক্লায়েন্ট ম্যানেজ করুন।",
         "Select any MikroTik router to monitor its interfaces, live traffic, and manage subscribers."),
        ("স্থানীয় IP নেটওয়ার্ক সতর্কতা (Private IP Subnet Detected)", "Local IP Network Notice (Private IP Subnet Detected)"),
        ("আপনার রাউটারের আইপি (<strong className=\"font-mono text-amber-700 \">{currentRouter.ip}</strong>) একটি লোকাল সাবনেট এর অংশ। যেহেতু এই বিলিং ও আইএসপি প্যানেলটি একটি ক্লাউড কনটেইনারে (Cloud Run) হোস্ট করা আছে, ক্লাউড সার্ভারটি সরাসরি আপনার ঘরের বা অফিসের ভেতরের লোকাল আইপিতে পৌঁছাতে পারবে না।",
         "Your router IP (<strong className=\"font-mono text-amber-700 \">{currentRouter.ip}</strong>) is on a private subnet. Since this ISP panel is hosted on a Cloud container, the cloud server cannot reach your private local IP directly."),
        ("সমাধানসমূহ:", "Solutions:"),
        ("আপনার রাউটারে Public WAN IP এবং Port Forwarding (8728) সেটআপ করুন।", "Set up a Public WAN IP with Port Forwarding (8728) on your router."),
        ("অথবা অফলাইনে টেস্ট করার জন্য <strong>Router Simulator Mode</strong> সক্রিয় করুন।", "Or enable <strong>Router Simulator Mode</strong> for offline testing and preview."),
        ("Actions (সম্পাদনা ও ডিলিট)", "Actions (Edit & Delete)"),
        ("এই মাইক্রোটিক রাউটারে ({currentRouter.name}) কোনো ক্লায়েন্ট পাওয়া যায়নি।", "No clients found on this MikroTik router ({currentRouter.name})."),
        ("MikroTik Simple Queues (ব্যান্ডউইথ শেপিং)", "MikroTik Simple Queues (Bandwidth Shaping)"),
        ("Add New MikroTik Router (নতুন মাইক্রোটিক রাউটার যুক্ত করুন)", "Add New MikroTik Router"),
        ("রাউটার কনফিগারেশন", "Router Configuration"),
        ("রাউটার নাম", "Router Name"),
        ("আইপি অ্যাড্রেস", "IP Address"),
        ("এপিআই পোর্ট", "API Port"),
        ("ইউজারনেম", "Username"),
        ("পাসওয়ার্ড", "Password"),
        ("কানেকশন টেস্ট", "Test Connection"),
        ("সিঙ্ক করুন", "Sync"),
        ("সক্রিয় রাউটার", "Active Routers"),
        ("নিষ্ক্রিয় রাউটার", "Inactive Routers"),
        ("সংযোগ বিচ্ছিন্ন", "Disconnected"),
        ("সংযুক্ত", "Connected"),
    ],
    "src/components/pages/Packages.tsx": [
        ("Device Target Option (ব্যবহারের ধরন) *", "Device Target Option *"),
        ("মোবাইল প্যাকেজ", "Mobile Package"),
        ("মোবাইলে ব্যবহারের জন্য (১ টি ডিভাইস)।", "For single mobile device usage."),
        ("রাউটার প্যাকেজ", "Router Package"),
        ("রাউটার কানেকশনের জন্য (শেয়ারড সাবনেট)।", "For Wi-Fi router / shared subnet connections."),
        ("উভয় ডিভাইস সমর্থিত (All Devices)", "All Devices Supported"),
        ("মোবাইল ও রাউটার উভয় ডিভাইসের জন্য উপযুক্ত।", "Suitable for both mobile devices and routers."),
        ("প্যাকেজের ধরন", "Package Type"),
        ("ব্যান্ডউইথ / স্পিড", "Bandwidth / Speed"),
        ("মূল্য (৳)", "Price (৳)"),
        ("রিনিউয়াল মূল্য (৳)", "Renewal Price (৳)"),
        ("মেয়াদের দিন", "Validity Days"),
        ("প্যাকেজ তৈরি করুন", "Create Package"),
        ("প্যাকেজ এডিট করুন", "Edit Package"),
        ("মুছে ফেলুন", "Delete"),
    ],
    "src/components/pages/Notifications.tsx": [
        ("একসেপ্ট করুন (Accept)", "Accept & Approve"),
        ("বাতিল", "Reject"),
        ("হটস্পট ক্লায়েন্ট নতুন প্যাকেজ আবেদন ({pendingRequests.length}টি পেন্ডিং)", "Hotspot Client New Package Requests ({pendingRequests.length} Pending)"),
        ("Clients পেইজে যান", "Go to Clients Page"),
        ("আইডি তৈরি ও ক্লাইন্টকে SMS পাঠান", "Create ID & Send SMS"),
        ("আপনি কি নিশ্চিত যে সমস্ত নোটিফিকেশন ও অ্যালার্ট ডাটা মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to clear all notification & alert data? (Hard Reset)"),
        ("রিনিউয়াল", "renewal"),
        ("রিনিউ", "renew"),
        ("হটস্পট", "hotspot"),
    ],
    "src/components/pages/SecurityPage.tsx": [
        ("ফাইল রিড করতে ব্যর্থ হয়েছে!", "Failed to read backup file!"),
        ("টু-ফ্যাক্টর অথেনটিকেশন (2FA), রোল-বেসড পারমিশন, লগইন হিস্ট্রি ও ডাটাবেজ ব্যাকআপ রিস্টোর।", "Two-Factor Authentication (2FA), role-based permissions, login history, and database backup & restore."),
        ("অ্যাডমিন প্যানেলে লগইন করার সময় Google Authenticator বা SMS ওটিপি কোড বাধ্যতামূলক করুন।", "Enforce Google Authenticator or SMS OTP verification when logging into the admin panel."),
        ("সকল রিমোট সেশন বাতিল করা হয়েছে!", "All active remote sessions have been terminated!"),
        ("ক্লায়েন্ট ডাটা, বিলিং হিসাব, পেমেন্ট ট্রানজেকশন ও সিস্টেম সেটিংসের একটি একক JSON ফাইল ব্যাকআপ।", "Single-file JSON backup of client records, billing accounts, payment transactions, and system configuration."),
    ],
    "src/components/pages/AdminProfilePage.tsx": [
        ("অ্যাডমিন প্রোফাইল ও অ্যাক্সেস কনফিগারেশন", "Admin Profile & Access Configuration"),
        ("সুপার অ্যাডমিন পরিচয়, লগইন ক্রেডেনশিয়াল ও সিস্টেম অথরাইজেশন সেটিংস", "Super Admin identity, login credentials, and system authorization settings"),
    ],
    "src/components/pages/AuditLogs.tsx": [
        ("সিস্টেম অডিট ও অ্যাক্টিভিটি লগ", "System Audit & Activity Logs"),
        ("সকল ইউজার অ্যাকশন, মাইক্রোটিক সিঙ্ক, পেমেন্ট রেকর্ড ও সিকিউরিটি লগ ট্র্যাকিং", "Comprehensive audit tracking of user actions, MikroTik synchronization, payments, and security logs"),
    ],
    "src/components/pages/Bandwidth.tsx": [
        ("ব্যান্ডউইথ প্রোফাইল ম্যানেজমেন্ট", "Bandwidth Profile Management"),
        ("মাইক্রোটিক কিউ (Simple Queue) ও ব্যান্ডউইথ পুল কনফিগারেশন হাব", "MikroTik Simple Queue & Bandwidth Pool Configuration Hub"),
    ],
    "src/components/pages/BillingPage.tsx": [
        ("বিলিং ও ইনভয়েস ম্যানেজমেন্ট", "Billing & Invoice Management"),
        ("সকল গ্রাহকের মাসিক বিল, অটো-ইনভয়েস জেনারেশন, পেমেন্ট কালেকশন ও রিসিট হাব", "Monthly billing, automated invoice generation, payment collections, and receipt hub"),
    ],
    "src/components/pages/ClientDashboard.tsx": [
        ("গ্রাহক সেলফ-কেয়ার ড্যাশবোর্ড", "Subscriber Self-Care Dashboard"),
    ],
    "src/components/pages/Clients.tsx": [
        ("গ্রাহক তালিকা ও ক্লায়েন্ট ম্যানেজমেন্ট", "Subscriber & Client Management"),
        ("ব্রডব্যান্ড গ্রাহকদের পূর্ণাঙ্গ ডাটাবেজ, মেয়াদ ট্র্যাকিং, প্যাকেজ ও রাউটার লিঙ্ক", "Broadband subscriber database, expiry tracking, package assignments, and router links"),
    ],
    "src/components/pages/Dashboard.tsx": [
        ("আইএসপি কন্ট্রোল ড্যাশবোর্ড", "ISP Control Dashboard"),
        ("রিয়েল-টাইম নেটওয়ার্ক স্ট্যাটাস, লাইভ ক্লায়েন্ট, মেয়াদ অ্যালার্ট ও রাজস্ব ওভারভিউ", "Real-time network status, live subscriber count, expiry alerts, and revenue overview"),
    ],
    "src/components/pages/DaysProfile.tsx": [
        ("মেয়াদের প্রোফাইল কনফিগারেশন", "Validity Profile Configuration"),
        ("প্যাকেজের সময়সীমা, বিলিং সাইকেল ও গ্রেস পিরিয়ড ম্যানেজমেন্ট", "Package validity duration, billing cycles, and grace period management"),
    ],
    "src/components/pages/ExpensesPage.tsx": [
        ("আইএসপি খরচ ও অপেক্স ট্র্যাকার", "ISP Expense & OPEX Tracker"),
        ("ব্যান্ডউইথ ফি, অফিস ভাড়া, টেকনিশিয়ান বেতন ও রক্ষণাবেক্ষণ খরচের হিসাব", "Bandwidth uplink fees, office rent, staff salaries, and maintenance expense tracking"),
    ],
    "src/components/pages/Hotspot.tsx": [
        ("হটস্পট ইউজার ও ভাউচার ম্যানেজমেন্ট", "Hotspot User & Voucher Management"),
        ("মাইক্রোটিক হটস্পট গ্রাহক, কার্ড প্রিন্টিং, অ্যাক্টিভেশন ও প্যাকেজ রিকুয়েস্ট", "MikroTik hotspot clients, card voucher printing, activation, and package requests"),
    ],
    "src/components/pages/HotspotConfig.tsx": [
        ("হটস্পট সার্ভার ও পোর্টাল কনফিগারেশন", "Hotspot Server & Portal Configuration"),
        ("লগইন পোর্টাল ব্র্যান্ডিং, পেমেন্ট গেটওয়ে লিঙ্ক ও মাইক্রোটিক প্যারামিটার", "Login portal branding, payment gateway integration, and MikroTik hotspot parameters"),
    ],
    "src/components/pages/InvoicePrintPage.tsx": [
        ("মানি রিসিট ও বিলিং ইনভয়েস", "Money Receipt & Billing Invoice"),
        ("অফিসিয়াল প্রিন্ট কপি", "Official Printable Copy"),
    ],
    "src/components/pages/IspDigitalModules.tsx": [
        ("ডিজিটাল আইএসপি মডিউল হাব", "Digital ISP Modules Hub"),
        ("এফটিটিএইচ অপটিক্যাল নেটওয়ার্ক, ওএলটি মনিটরিং, স্প্লিটার ম্যাপিং ও অটোমেশন টুলস", "FTTH optical network, OLT monitoring, splitter mapping, and automated operations tools"),
    ],
    "src/components/pages/LiveBandwidthPage.tsx": [
        ("লাইভ নেটওয়ার্ক ব্যান্ডউইথ মনিটর", "Live Network Bandwidth Monitor"),
        ("মাইক্রোটিক ইন্টারফেস ভিত্তিক রিয়েল-টাইম ট্রাফিক গ্রাফ ও ব্যবহার অ্যানালিটিক্স", "MikroTik interface real-time traffic graphs and bandwidth analytics"),
    ],
    "src/components/pages/NetworkCoverageMap.tsx": [
        ("নেটওয়ার্ক কভারেজ ও পপ (POP) ম্যাপ", "Network Coverage & POP Map"),
        ("আইএসপি জোন, ফাইবার ক্যাবল রুট, অপটিক্যাল নোড ও কভারেজ এলাকার লাইভ ম্যাপ", "ISP zones, fiber cable routes, optical distribution nodes, and coverage area map"),
    ],
    "src/components/pages/Reports.tsx": [
        ("রিপোর্ট ও ব্যবসায়িক অ্যানালিটিক্স", "Reports & Business Analytics"),
        ("মাসিক কালেকশন, রাজস্ব বৃদ্ধি, বকেয়া তালিকা ও ক্লায়েন্ট গ্রোথ স্টেটমেন্ট", "Monthly collections, revenue trends, due accounts, and subscriber growth statements"),
    ],
}

def run_replacements():
    for f, pair_list in replacements.items():
        if os.path.exists(f):
            with open(f, "r", encoding="utf-8") as file:
                content = file.read()
            orig = content
            for k, v in pair_list:
                content = content.replace(k, v)
            if content != orig:
                with open(f, "w", encoding="utf-8") as file:
                    file.write(content)
                print(f"Updated {f}")

run_replacements()
