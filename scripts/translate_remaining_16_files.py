import re
import os

def update_file(filepath, replacements):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    orig倍 = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != orig倍:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated: {filepath}")

# 1. AuditLogs.tsx
update_file("src/components/pages/AuditLogs.tsx", [
    ("সিস্টেম অডিট ও সিকিউরিটি লগ ট্র্যাকার", "System Audit & Security Log Tracker"),
    ("অ্যাডমিন কার্যকলাপ, ক্লায়েন্ট পরিবর্তন, পেমেন্ট ও সিস্টেম ইভেন্টের স্বয়ংক্রিয় রেকর্ড।", "Automated records of administrator activity, subscriber updates, payments, and system events."),
    ("আপনি কি নিশ্চিত যে সমস্ত অডিট লগ ডাটা চিরতরে মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to permanently clear all audit log data? (Hard Reset)"),
    ("লগ ডাটা রিসেট", "Reset Log Data"),
    ("অনুসন্ধান করুন...", "Search logs..."),
    ("সকল ক্যাটাগরি", "All Categories"),
    ("কোনো অডিট লগ পাওয়া যায়নি।", "No audit logs found."),
])

# 2. BillingPage.tsx
update_file("src/components/pages/BillingPage.tsx", [
    ("সকল গ্রাহকের মাসিক বিল, অটো-ইনভয়েস জেনারেশন, পেমেন্ট কালেকশন ও রিসিট হাব।", "Monthly billing, automated invoice generation, payment collections, and receipt hub."),
    ("আপনি কি নিশ্চিত যে সমস্ত ইনভয়েস ও বিলিং ডাটা চিরতরে মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to permanently clear all invoice & billing data? (Hard Reset)"),
    ("ইনভয়েস ডাটা রিসেট", "Reset Invoice Data"),
    ("নতুন ইনভয়েস তৈরি", "Create New Invoice"),
    ("গ্রাহক খুঁজুন...", "Search invoices by subscriber, phone, ID..."),
    ("সকল পেমেন্ট স্ট্যাটাস", "All Payment Statuses"),
    ("পরিশোধিত", "Paid"),
    ("বকেয়া", "Unpaid"),
    ("আংশিক", "Partial"),
    ("বাতিল", "Cancelled"),
    ("কোনো ইনভয়েস পাওয়া যায়নি।", "No invoices found."),
    ("ইনভয়েস নং", "Invoice #"),
    ("গ্রাহকের নাম ও আইডি", "Subscriber Name & ID"),
    ("প্যাকেজ ও বিবরণ", "Package & Details"),
    ("বিল পরিমাণ", "Amount"),
    ("পরিশোধিত পরিমাণ", "Paid Amount"),
    ("বকেয়া", "Due"),
    ("ইস্যু তারিখ", "Issue Date"),
    ("পরিশোধের শেষ তারিখ", "Due Date"),
    ("অ্যাকশন", "Actions"),
    ("পেমেন্ট গ্রহণ করুন", "Collect Payment"),
    ("মানি রিসিট প্রিন্ট", "Print Receipt"),
    ("ইনভয়েস দেখুন", "View Invoice"),
])

# 3. ClientDashboard.tsx
update_file("src/components/pages/ClientDashboard.tsx", [
    ("স্বাগতম, আপনার ইন্টারনেট সংযোগ ও বিলিং পোর্টাল", "Welcome to your Internet Connection & Billing Portal"),
    ("আপনার বর্তমান সাবস্ক্রিপশন ও বিলিং বিবরণী", "Your current subscription details & billing statements"),
    ("প্যাকেজ স্পিড", "Package Speed"),
    ("মেয়াদের তারিখ", "Expiry Date"),
    ("মাসিক বিল", "Monthly Bill"),
    ("সংযোগ স্ট্যাটাস", "Connection Status"),
    ("অনলাইন (সক্রিয়)", "Online (Active)"),
    ("অফলাইন (মেয়াদ শেষ)", "Offline (Expired)"),
    ("বিল পরিশোধ করুন", "Pay Bill Online"),
    ("অভিযোগ দাখিল করুন", "Submit Support Ticket"),
    ("আপনার অভিযোগ বা সমস্যা লিখুন...", "Describe your issue or complaint..."),
    ("অভিযোগ পাঠান", "Submit Ticket"),
    ("টিকেট সফলভাবে দাখিল করা হয়েছে!", "Ticket submitted successfully!"),
])

# 4. Clients.tsx
update_file("src/components/pages/Clients.tsx", [
    ("গ্রাহকদের তালিকা ও অ্যাক্টিভেশন ম্যানেজমেন্ট।", "Subscriber Directory & Activation Management."),
    ("আপনি কি নিশ্চিত যে সমস্ত গ্রাহক ডাটা চিরতরে মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to permanently clear all client data? (Hard Reset)"),
    ("ক্লায়েন্ট ডাটা রিসেট", "Reset Client Data"),
    ("নতুন ক্লায়েন্ট যোগ", "Add New Client"),
    ("গ্রাহক খুঁজুন (নাম, মোবাইল, ইউজার আইডি, আইপি)...", "Search clients (name, mobile, user ID, IP)..."),
    ("সকল জোন / এলাকা", "All Zones / Areas"),
    ("সকল প্যাকেজ", "All Packages"),
    ("কোনো গ্রাহক পাওয়া যায়নি।", "No subscribers found."),
    ("ইউজার আইডি ও নাম", "User ID & Name"),
    ("মোবাইল ও ঠিকানা", "Mobile & Address"),
    ("প্যাকেজ ও বিল", "Package & Bill"),
    ("সংযোগ টাইপ", "Type"),
    ("আইপি / ম্যাক", "IP / MAC"),
    ("মেয়াদোত্তীর্ণ তারিখ", "Expiry Date"),
    ("সম্পাদনা", "Edit"),
    ("মুছে ফেলুন", "Delete"),
    ("এসএমএস পাঠান", "Send SMS"),
    ("বিল জমা নিন", "Collect Bill"),
])

# 5. Dashboard.tsx
update_file("src/components/pages/Dashboard.tsx", [
    ("আইএসপি কন্ট্রোল ও রিয়েল-টাইম অপারেশন ড্যাশবোর্ড।", "ISP Control & Real-Time Operations Dashboard."),
    ("মোট গ্রাহক", "Total Subscribers"),
    ("অনলাইন সক্রিয়", "Online Active"),
    ("মেয়াদোত্তীর্ণ / অফলাইন", "Expired / Offline"),
    ("চলতি মাসের আয়", "Monthly Revenue"),
    ("মোট বকেয়া", "Total Due"),
    ("আজকের কালেকশন", "Today's Collection"),
    ("দ্রুত অ্যাকশন হাব", "Quick Action Hub"),
    ("নতুন গ্রাহক", "New Client"),
    ("বিলিং তৈরি", "Generate Bill"),
    ("মেসেজ পাঠান", "Send SMS"),
    ("রাউটার সিঙ্ক", "Router Sync"),
    ("মেয়াদোত্তীর্ণের সতর্কতা", "Expiry Warnings"),
    ("সাম্প্রতিক ট্রানজেকশন", "Recent Transactions"),
    ("নেটওয়ার্ক ট্রাফিক", "Network Traffic"),
])

# 6. DaysProfile.tsx
update_file("src/components/pages/DaysProfile.tsx", [
    ("প্যাকেজের সময়সীমা, বিলিং সাইকেল ও গ্রেস পিরিয়ড কনফিগারেশন।", "Package validity duration, billing cycles, and grace period configuration."),
    ("মেয়াদের সমস্ত প্রোফাইল ডাটা মুছে ফেলতে চান?", "clear all validity profile data?"),
    ("নতুন Days Profile খুলুন", "Add New Days Profile"),
    ("টেস্ট মেয়াদের ক্যালকুলেটর (Quick Validity Test)", "Quick Validity Test Calculator"),
    ("Select Days Profile (প্রোফাইল নির্বাচন)", "Select Days Profile"),
    ("Start Date (মেয়াদের শুরুর Date)", "Start Date"),
    ("দিন", "days"),
    ("গ্রেস", "grace"),
    ("প্রোফাইলের নাম", "Profile Name"),
    ("মেয়াদের দিন সংখ্যা", "Duration Days"),
    ("গ্রেস পিরিয়ড (দিন)", "Grace Period (Days)"),
    ("ডিফল্ট হিসেবে সেট করুন", "Set as Default"),
    ("সংরক্ষণ করুন", "Save Profile"),
    ("সম্পাদনা", "Edit"),
    ("মুছে ফেলুন", "Delete"),
    ("কোনো মেয়াদের প্রোফাইল পাওয়া যায়নি।", "No validity profiles found."),
])

# 7. ExpensesPage.tsx
update_file("src/components/pages/ExpensesPage.tsx", [
    ("অনুগ্রহ করে সঠিক খরচের তথ্য ও Amount লিখুন।", "Please enter valid expense details and amount."),
    ("খরচ সফলভাবে যুক্ত করা হয়েছে!", "Expense recorded successfully!"),
    ("আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি মুছে ফেলতে চান?", "Are you sure you want to delete this expense record?"),
    ("খরচের রেকর্ড মুছে ফেলা হয়েছে।", "Expense record deleted."),
    ("ব্যান্ডউইথ আপস্ট্রিম বিল, বিদ্যুৎ, কর্মীদের বেতন, সার্ভার ভাড়া ও অফিসের যাবতীয় খরচের হিসাব।", "Bandwidth upstream bills, electricity, staff salaries, server costs, and office OPEX tracking."),
    ("Total Month Revenue (আয়)", "Total Month Revenue"),
    ("Total Month Expenses (ব্যয়)", "Total Month Expenses"),
    ("Net Profit / Margin (নিট লাভ)", "Net Profit / Margin"),
])

# 8. Hotspot.tsx
update_file("src/components/pages/Hotspot.tsx", [
    ("Package রিকুয়েস্ট", "Package Requests"),
    ("আপনি কি নিশ্চিত যে হটস্পটের সমস্ত ডাটা মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to reset all hotspot data? (Hard Reset)"),
    ("হটস্পট Package কেনার আবেদন (Client Package Requests)", "Hotspot Client Package Requests"),
    ("এক্সেস পয়েন্টের মাধ্যমে হটস্পট পেজ থেকে গ্রাহকদের Sendো Package আবেদনের তালিকা", "Subscribers package purchase requests submitted via Hotspot portal"),
    ("Clients পেইজে আইডি তৈরি করুন", "Create Client ID in Clients Page"),
    ("কোন হটস্পট Package আবেদন পাওয়া যায়নি।", "No hotspot package requests found."),
    ("ID ও SMS Send", "ID & SMS Send"),
    ("হটস্পট ক্লায়েন্ট আইডি অনুমোদন ও SMS Send", "Approve Hotspot Client ID & Send SMS"),
    ("নতুন হটস্পট ভাউচার জেনারেট করুন", "Generate New Hotspot Vouchers"),
    ("কার্ডের সংখ্যা", "Number of Cards"),
    ("ভাউচার প্রিন্ট প্রিভিউ", "Voucher Print Preview"),
    ("প্রিন্ট করুন", "Print Vouchers"),
    ("কোনো হটস্পট ইউজার পাওয়া যায়নি।", "No hotspot users found."),
])

# 9. HotspotConfig.tsx
update_file("src/components/pages/HotspotConfig.tsx", [
    ("Package কেনার পর সাথে সাথে User ID এবং Password তৈরি হয়ে মেসেজে অথবা স্ক্রিনে দেখাবে। সমস্যা হলে যোগাযোগ করুন:", "Upon purchasing a package, your User ID & Password will be generated instantly on screen and via SMS. For support, call:"),
    ("আপনার নাম লিখুন", "Enter your full name"),
    ("নিচের নম্বরে <strong>Send Money</strong> করে Transaction ID লিখুন:<br>", "Send Money to the number below and enter the Transaction ID:<br>"),
    ("অর্ডার সফল হয়েছে!", "Order Placed Successfully!"),
    ("আপনার User ID ও Password নিচে দেওয়া হলো। এডমিনকে নোটিফিকেশন Sendো হয়েছে।", "Your User ID & Password are shown below. Admin has been notified."),
    ("alert('অনুগ্রহ করে Mobile Number প্রদান করুন!');", "alert('Please enter your Mobile Number!');"),
])

# 10. InvoicePrintPage.tsx
update_file("src/components/pages/InvoicePrintPage.tsx", [
    ("অফিশিয়াল ইনভয়েস জেনারেট, ডিরেক্ট প্রিন্ট, মানি রিসিট ও ওয়াটসঅ্যাপ শেয়ার।", "Official invoice generation, direct printing, money receipts, and WhatsApp sharing."),
])

# 11. IspDigitalModules.tsx
update_file("src/components/pages/IspDigitalModules.tsx", [
    ("এর সমস্ত ডাটা সম্পূর্ণ মুছে ফেলে নতুনভাবে শুরু করতে চান? (Hard Reset)", "data and start fresh? (Hard Reset)"),
    ("এর সমস্ত ডাটা মুছে ফেলা হয়েছে।", "data has been reset."),
])

# 12. LiveBandwidthPage.tsx
update_file("src/components/pages/LiveBandwidthPage.tsx", [
    ("সার্ভারের আপস্ট্রিম, ব্যান্ডউইথ কনজাম্পশন, পিক ট্রাফিক ও প্রতিটি ক্লায়েন্টের রিয়েল-টাইম স্পিড মনিটর।", "Server upstream, bandwidth consumption, peak traffic, and real-time subscriber speed monitor."),
    ("প্রতিটি সংযুক্ত গ্রাহকের বর্তমান ডাউনলোড ও Upload Speed", "Current download & upload speed for each connected subscriber"),
    ("কোনো অ্যাক্টিভ ক্লায়েন্ট পাওয়া যায়নি।", "No active clients found."),
])

# 13. MikrotikManagement.tsx
update_file("src/components/pages/MikrotikManagement.tsx", [
    ("যে কোন মাইক্রোটিক রাউটারে ক্লিক করে সেটির ইন্টারফেস, ট্রাফিক এবং ক্লায়েন্ট ম্যানেজ করুন।", "Select any MikroTik router to view its interfaces, live traffic, and manage subscribers."),
    ("e.g. মোঃ করিম উদ্দিন", "e.g. John Doe"),
    ("Phone Number (মোবাইল) *", "Phone Number *"),
    ("Monthly Price (৳ টাকা)", "Monthly Price (৳)"),
    ("Price (৳ টাকা)", "Price (৳)"),
    ("কেন লোকাল আইপি (যেমন 192.168.88.1) সরাসরি ক্লাউড অ্যাপে কানেক্ট হয় না?", "Why private local IPs (like 192.168.88.1) cannot connect directly across the public cloud"),
    ("এই ISP বিলিং অ্যাপটি ইন্টারনেটের সুরক্ষিত ক্লাউড সার্ভারে চলে। আপনার লোকাল রাউটারের <strong>192.168.88.1</strong> বা <strong>10.x.x.x</strong> হলো আপনার নিজস্ব অফিস/হোম নেটওয়ার্কের প্রাইভেট আইপি। ইন্টারনেট ক্লাউড থেকে সরাসরি লোকাল প্রাইভেট আইপিতে ঢুকতে পারে না।",
     "This ISP billing app is hosted on a secure cloud server. Your local router IP <strong>192.168.88.1</strong> or <strong>10.x.x.x</strong> is a private local address inaccessible directly from public cloud networks."),
    ("পদ্ধতি ১: MikroTik Cloud DDNS (সম্পূর্ণ ফ্রি ও সহজ)", "Method 1: MikroTik Cloud DDNS (Free & Easy)"),
])

# 14. Notifications.tsx
update_file("src/components/pages/Notifications.tsx", [
    ("hotspot অনুমোদন", "Hotspot Approval"),
])

# 15. Packages.tsx
update_file("src/components/pages/Packages.tsx", [
    ("Validity / Duration (মেয়াদ)", "Validity / Duration"),
    ("২৪ ঘন্টা (24 Hours)", "24 Hours"),
    ("৩০ দিন (30 Days)", "30 Days"),
    ("Device Target Option (ব্যবহারের ধরন)", "Device Target Option"),
    ("১ টি মোবাইল ডিভাইস।", "Single mobile device."),
    ("রাউটার ব্রডব্যান্ড (শেয়ারড)।", "Wi-Fi Router (Shared)."),
])

# 16. RevenueTracker.tsx
update_file("src/components/pages/RevenueTracker.tsx", [
    ("টি রিচার্জ ট্রানজেকশন সম্পন্ন", " recharge transactions completed"),
    ("আজকের মোট কালেকশন", "Today Total Collection"),
    ("আজকে মোট", "Today a total of"),
    ("জন রিচার্জ করেছেন", "subscribers recharged"),
    ("রিচার্জকৃত ক্লায়েন্ট সংখ্যা", "Recharged Subscribers Count"),
    ("জন", "Clients"),
    ("গড় রিচার্জ:", "Avg Recharge:"),
    ("সর্বোচ্চ আয় ডে (Peak Day)", "Peak Revenue Day"),
    ("ঐ দিনে উঠেছিল", "Collected on that day:"),
    ("কালেকশন", "Collection"),
    ("হাতে", "Hand"),
    ("ভাউচার", "Voucher"),
    ("১ Yearের মোট অর্জিত আয় (Annual Revenue)", "Annual Gross Revenue (1 Year)"),
    ("১২ Monthের সম্মিলিত সর্বমোট কালেকশন", "Combined 12 Months Total Collections"),
    ("গড় Monthিক কালেকশন (Monthly Average)", "Monthly Average Collection"),
    ("প্রতি Monthে গড়ে ইনকাম হয়", "Average monthly income"),
    ("নির্বাচিত Monthের আয়", "Selected Month Revenue"),
    ("টি ট্রানজেকশন সংগৃহীত", " transactions recorded"),
    ("১ Yearের Monthিক আয় তুলনা গ্রাফ (12 Months Financial Comparison)", "12-Month Financial Comparison Graph"),
    ("নিচের যেকোনো Monthের বারে ক্লিক করে সংশ্লিষ্ট Monthের বিস্তারিত ড্যাশবোর্ড লোড করুন।", "Click any month bar to load detailed monthly analytics."),
    ("আর্কাইভ কালসীমা: ১২ Month", "Archive Period: 12 Months"),
    ("ইতিহাস দেখা হচ্ছে", "Viewing History"),
    ("আয়:", "Revenue:"),
    ("মোট কালেকশন:", "Total Collection:"),
    ("টি এন্ট্রি", " entries"),
    ("Monthের প্রতিদিনের কালেকশন গ্রাফ:", "Daily Collections Graph:"),
    ("চলতি Monthের আয় সোর্স ও ট্রানজেকশন তালিকা", "Current Month Revenue Sources & Transactions"),
    ("Monthের ট্রানজেকশন ইতিহাস", "Month Transaction History"),
    ("অল-টাইম সকল রিচার্জ ট্রানজেকশন", "All-Time Recharge Transactions"),
    ("মোট", "Total"),
    ("টি রিচার্জ রেকর্ড দেখানো হচ্ছে", " recharge records shown"),
    ("Client Name / ID খুঁজুন...", "Search Client Name / ID..."),
    ("সব Payment Method", "All Payment Methods"),
    ("Hand Cash (হাতে/Cash)", "Hand Cash"),
    ("সব টাইপ", "All Types"),
    ("ব্রডব্যান্ড রিচার্জ", "Broadband Recharge"),
    ("হটস্পট ভাউচার", "Hotspot Voucher"),
    ("নতুন সংযোগ", "New Connection"),
    ("করপোরেট বিল", "Corporate Bill"),
    ("Txn ID / সময়", "Txn ID / Time"),
    ("ক্লায়েন্ট Details", "Client Details"),
    ("পেমেন্ট সোর্স", "Payment Source"),
    ("টাইপ / কালেকটর", "Type / Collector"),
    ("কোনো ট্রানজেকশন রেকর্ড পাওয়া যায়নি।", "No transaction records found."),
    ("কালেক্টর:", "Collector:"),
    ("New Client রিচার্জ / পেমেন্ট এন্ট্রি", "New Client Recharge / Payment Entry"),
    ("বিদ্যমান ক্লায়েন্ট নির্বাচন করুন (অপশনাল)", "Select Existing Client (Optional)"),
    ("-- অথবা নিচে ম্যানুয়ালি নাম ও আইডি দিন --", "-- Or enter name & ID manually below --"),
    ("ক্লায়েন্টের নাম *", "Client Name *"),
    ("e.g. রফিকুল ইসলাম", "e.g. John Doe"),
    ("Package নির্বাচন", "Select Package"),
    ("Payment Method (সোর্স)", "Payment Method (Source)"),
    ("লেনদেনের ধরণ", "Transaction Type"),
    ("নতুন গ্রাহক সংযোগ", "New Client Activation"),
    ("রিচার্জের Date", "Recharge Date"),
    ("কালেক্টর নাম", "Collector Name"),
    ("⚡ সাবমিট করুন ও গ্রাফে যোগ করুন", "⚡ Submit & Add to Graph"),
    ("লেনদেন)", "transactions)"),
    ("⚡ এটি আজকের দিন (Running Day)", "⚡ Today (Running Day)"),
    ("বার নির্বাচন পরিবর্তন করতে অন্য যেকোনো Dateে ক্লিক করুন", "Click on any date to inspect daily breakdown"),
])

print("All 16 remaining files updated.")
