import re
import glob
import os

def replace_in_file(filepath, mapping):
    if not os.path.exists(filepath):
        print(f"Skipping missing file: {filepath}")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()
    orig = text
    for old, new in mapping:
        text = text.replace(old, new)
    if text != orig:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Cleaned {filepath}")

# 1. AuditLogs.tsx
replace_in_file("src/components/pages/AuditLogs.tsx", [
    ("সিস্টেম অডিট ও সিকিউরিটি লগ ট্র্যাকার", "System Audit & Security Log Tracker"),
    ("অ্যাডমিন কার্যকলাপ, ক্লায়েন্ট পরিবর্তন, পেমেন্ট ও সিস্টেম ইভেন্টের স্বয়ংক্রিয় রেকর্ড।", "Automated records of admin activity, client updates, payments, and system events."),
    ("আপনি কি নিশ্চিত যে সমস্ত অডিট লগ ডাটা চিরতরে মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to permanently delete all audit log data? (Hard Reset)"),
    ("লগ ডাটা রিসেট", "Reset Log Data"),
    ("লগ ফিল্টার", "Filter Logs"),
    ("লগ অনুসন্ধান", "Search Logs"),
    ("ক্যাটাগরি", "Category"),
    ("অ্যাকশন বিবরণ", "Action Details"),
    ("ইউজার / অপারেটর", "User / Operator"),
    ("টাইমস্ট্যাম্প", "Timestamp"),
    ("আইপি", "IP"),
    ("কোনো অডিট লগ রেকর্ড নেই।", "No audit log records found."),
])

# 2. BillingPage.tsx
replace_in_file("src/components/pages/BillingPage.tsx", [
    ("টাকা জমা নিন", "Collect Payment"),
    ("ইনভয়েস তৈরি", "Create Invoice"),
    ("বিলিং তালিকা", "Billing List"),
    ("সকল স্ট্যাটাস", "All Statuses"),
    ("পরিশোধিত", "Paid"),
    ("বকেয়া", "Unpaid"),
    ("আংশিক", "Partial"),
    ("গ্রাহক", "Subscriber"),
    ("পরিমাণ", "Amount"),
    ("তারিখ", "Date"),
    ("স্ট্যাটাস", "Status"),
    ("অ্যাকশন", "Actions"),
    ("প্রিন্ট", "Print"),
])

# 3. ClientDashboard.tsx
replace_in_file("src/components/pages/ClientDashboard.tsx", [
    ("অভিযোগ সাবমিট করা হয়েছে। অ্যাডমিন টিম দ্রুত কাজ শুরু করবে!", "Ticket submitted successfully. Support team will inspect shortly!"),
    ("টিকেট সাবমিট করতে ত্রুটি হয়েছে।", "Failed to submit ticket."),
    ("দয়া করে আপনার Mobile Number লিখুন!", "Please enter your Mobile Number!"),
    ("দয়া করে পেমেন্টের Transaction ID (TrxID) লিখুন!", "Please enter the payment Transaction ID (TrxID)!"),
    ("পেমেন্ট রিনিউয়াল আবেদন পাঠানো হয়েছে! এডমিন যাচাই করে লাইন সচল করবেন।", "Renewal request submitted! Admin will verify and activate your service."),
    ("আবেদন পাঠাতে ত্রুটি হয়েছে।", "Error submitting renewal request."),
    ("ইন্টারনেট প্যাকেজ ও পেমেন্ট পোর্টাল", "Internet Package & Payment Portal"),
    ("অনলাইন রিচার্জ ও সাপোর্ট", "Online Recharge & Support"),
    ("আপনার প্রোফাইল", "Your Profile"),
    ("নাম:", "Name:"),
    ("ইউজার আইডি:", "User ID:"),
    ("ফোন:", "Phone:"),
    ("ঠিকানা:", "Address:"),
    ("বর্তমান প্যাকেজ:", "Current Package:"),
    ("মেয়াদের তারিখ:", "Expiry Date:"),
    ("বকেয়া বিল:", "Due Amount:"),
    ("সংযোগ অবস্থা:", "Connection Status:"),
    ("সক্রিয় / অনলাইন", "Active / Online"),
    ("মেয়াদোত্তীর্ণ / অফলাইন", "Expired / Offline"),
    ("দ্রুত বিল পরিশোধ (Online Pay)", "Quick Bill Payment (Online Pay)"),
    ("বিকাশ মার্চেন্ট / পার্সোনাল নম্বর:", "bKash Merchant / Personal No:"),
    ("নগদ মার্চেন্ট / পার্সোনাল নম্বর:", "Nagad Merchant / Personal No:"),
    ("পেমেন্ট মেথড নির্বাচন করুন", "Select Payment Method"),
    ("আপনার মোবাইল নম্বর লিখুন", "Enter your mobile number"),
    ("ট্রানজেকশন আইডি (TrxID) লিখুন", "Enter Transaction ID (TrxID)"),
    ("পেমেন্ট সাবমিট করুন", "Submit Payment"),
    ("অভিযোগ বা সমস্যা জানান (Support Ticket)", "Submit Support Ticket"),
    ("অভিযোগের ধরন নির্বাচন করুন", "Select Issue Category"),
    ("ইন্টারনেট স্পিড কম", "Slow Internet Speed"),
    ("লাইন সম্পূর্ণ বন্ধ / রেড লাইট", "No Connection / Red LOS"),
    ("রাউটার কনফিগারেশন সমস্যা", "Router Configuration Issue"),
    ("বিলিং ও পেমেন্ট সমস্যা", "Billing & Payment Issue"),
    ("অন্যান্য সমস্যা", "Other Issue"),
    ("বিস্তারিত সমস্যা লিখুন...", "Describe your issue in detail..."),
    ("টিকেট পাঠান", "Submit Ticket"),
    ("সাহায্য বা হেল্পলাইন:", "Support Helpline:"),
])

# 4. Clients.tsx
replace_in_file("src/components/pages/Clients.tsx", [
    ("Package লাইভ এক্সপায়ারি কাউন্টডাউন (Live Expiry Countdown)", "Package Live Expiry Countdown"),
    ("মেয়াদ শেষ হওয়ায় ক্লায়েন্টের লাইন স্বয়ংক্রিয়ভাবে অফলাইন করা হয়েছে।", "Client line set offline automatically due to package expiry."),
    ("Packageের অবশিষ্ট সময় রিয়েল-টাইমে সেকেন্ডসহ গণনা হচ্ছে।", "Remaining validity time counted in real-time with seconds."),
    ("অফলাইন (EXPIRED / AUTO-OFFLINE)", "OFFLINE (EXPIRED / AUTO-OFFLINE)"),
    ("লাইন সক্রিয় (ONLINE / ACTIVE)", "LINE ACTIVE (ONLINE / ACTIVE)"),
    ("নিচে মেয়াদ বাড়ানোর বাটনে ক্লিক করলে লাইন পুনরায় স্বয়ংক্রিয়ভাবে এক্টিভ ও অনলাইন হয়ে যাবে।", "Click renew validity below to reactivate connection and set line back online."),
    ("দিন (Days)", "Days"),
    ("ঘণ্টা (Hours)", "Hours"),
    ("মিনিট (Mins)", "Mins"),
    ("সেকেন্ড (Secs)", "Secs"),
    ("প্রোফাইল থেকে সরাসরি মেয়াদ বৃদ্ধি করুন (Quick Extend Validity):", "Quick Extend Validity from Profile:"),
    ("কাস্টম দিন বাড়ান:", "Custom Days:"),
    ("দিন বাড়ান", "Add Days"),
    ("১ মাস (30 Days)", "1 Month (30 Days)"),
    ("১৫ দিন (15 Days)", "15 Days"),
    ("৭ দিন (7 Days)", "7 Days"),
    ("৩ দিন (3 Days)", "3 Days"),
    ("১ দিন (1 Day)", "1 Day"),
    ("মেয়াদ বৃদ্ধি সফল হয়েছে!", "Validity extended successfully!"),
    ("ক্লায়েন্ট তথ্য", "Client Information"),
    ("ক্লায়েন্টের তালিকা", "Clients Directory"),
    ("নাম ও ইউজার আইডি", "Name & User ID"),
    ("মোবাইল নম্বর", "Mobile Number"),
    ("জোন / এলাকা", "Zone / Area"),
    ("প্যাকেজ", "Package"),
    ("মাসিক বিল", "Monthly Bill"),
    ("মেয়াদ", "Expiry"),
    ("স্ট্যাটাস", "Status"),
    ("অ্যাকশন", "Actions"),
    ("সক্রিয়", "Active"),
    ("মেয়াদ শেষ", "Expired"),
    ("সাসপেন্ড", "Suspended"),
    ("নতুন ক্লায়েন্ট", "New Client"),
    ("ফিল্টার", "Filter"),
    ("অনুসন্ধান...", "Search subscribers..."),
])

# 5. Dashboard.tsx
replace_in_file("src/components/pages/Dashboard.tsx", [
    ("আইএসপি ড্যাশবোর্ড ওভারভিউ", "ISP Dashboard Overview"),
    ("রিয়েল-টাইম ক্লায়েন্ট ও নেটওয়ার্ক সারাংশ", "Real-Time Subscribers & Network Summary"),
    ("মোট গ্রাহক", "Total Clients"),
    ("সক্রিয় অনলাইন", "Active Online"),
    ("মেয়াদ শেষ / অফলাইন", "Expired / Offline"),
    ("চলতি মাসের আয়", "Monthly Revenue"),
    ("বকেয়া বিল", "Total Due"),
    ("আজকের কালেকশন", "Today Collection"),
    ("দ্রুত অ্যাকশন", "Quick Actions"),
    ("নতুন গ্রাহক যুক্ত করুন", "Add New Client"),
    ("বিলিং ইনভয়েস তৈরি", "Create Invoice"),
    ("এসএমএস নোটিফিকেশন পাঠান", "Send SMS"),
    ("মাইক্রোটিক সিঙ্ক করুন", "Sync MikroTik"),
    ("মেয়াদ শেষ হওয়ার সতর্কতা", "Expiring Soon Warnings"),
    ("সাম্প্রতিক পেমেন্ট", "Recent Payments"),
    ("নেটওয়ার্ক ট্রাফিক", "Network Traffic"),
])

# 6. DaysProfile.tsx
replace_in_file("src/components/pages/DaysProfile.tsx", [
    ("Days Profiles (মেয়াদের প্রোফাইল)", "Days Profiles (Validity Profiles)"),
    ("ক্লাইন্ট আইডি তৈরি ও রিনিউ করার সময় কতdays মেয়াদ (যেমন ১, ৭, ১৫, ৩০, ৯০ বা ৩৬৫ days) হবে তা সেভ করে রাখুন। ক্লাইন্ট যুক্ত করতে গেলে ১-ক্লিকেই অটোমেটিক এক্সপায়ারি ডেট হিসাব হয়ে যাবে!",
     "Save validity durations (e.g. 1, 7, 15, 30, 90, or 365 days) used during client creation and renewals for 1-click automatic expiry calculation!"),
    ("আপনি কি নিশ্চিত যে clear all validity profile data? (Hard Reset)", "Are you sure you want to clear all validity profile data? (Hard Reset)"),
    ("মেয়াদ (Duration)", "Duration"),
    ("grace বোনাস", "Grace Bonus"),
    ("days বোনাস", "days bonus"),
    ("মোবাইল", "Mobile"),
    ("রাউটার", "Router"),
    ("সব ডিভাইস", "All Devices"),
    ("নতুন Days Profile যুক্ত করুন", "Add New Days Profile"),
    ("প্রোফাইল নাম", "Profile Name"),
    ("মেয়াদের দিন", "Validity Days"),
    ("গ্রেস দিন", "Grace Days"),
    ("ডিভাইস সাপোর্ট", "Supported Devices"),
    ("সংরক্ষণ", "Save"),
    ("বাতিল", "Cancel"),
])

# 7. ExpensesPage.tsx
replace_in_file("src/components/pages/ExpensesPage.tsx", [
    ("কোনো খরচের রেকর্ড পাওয়া যায়নি।", "No expense records found."),
])

# 8. Hotspot.tsx
replace_in_file("src/components/pages/Hotspot.tsx", [
    ("Package ও বিল:", "Package & Bill:"),
    ("পেমেন্ট গেটওয়ে & TrxID:", "Payment Gateway & TrxID:"),
    ("কাস্টমার Message Preview (SMS / WhatsApp Text)", "Customer Message Preview (SMS / WhatsApp Text)"),
    ("Nexora network-তে আপনাকে Welcome! আপনার Hotspot User ID:", "Welcome to Nexora network! Your Hotspot User ID:"),
    ("Password:", "Password:"),
    ("Login Portal:", "Login Portal:"),
    ("SMS মেসেজ ক্লিপবোর্ডে কপি করা হয়েছে!", "SMS message copied to clipboard!"),
    ("📋 টেক্সট কপি করুন", "📋 Copy Text"),
    ("📱 মোবাইল SMS App দিয়ে Send", "📱 Send via Mobile SMS App"),
    ("অনুমোদন ও SMS Send", "Approve & Send SMS"),
    ("বাতিল করুন", "Reject"),
    ("ভাউচার প্রিন্ট", "Print Vouchers"),
    ("হটস্পট ইউজার", "Hotspot Users"),
    ("কার্ড ভাউচার", "Card Vouchers"),
    ("অনুরোধ তালিকা", "Requests List"),
])

# 9. IspDigitalModules.tsx
replace_in_file("src/components/pages/IspDigitalModules.tsx", [
    ("আপনি কি নিশ্চিত যে", "Are you sure you want to reset"),
])

# 10. MikrotikManagement.tsx
replace_in_file("src/components/pages/MikrotikManagement.tsx", [
    ("WinBox এর <strong>Terminal</strong> ওপেন করে নিচের ৪ লাইনের কমান্ড কপি-পেস্ট করে Enter চাপুন:", 
     "Open <strong>Terminal</strong> in WinBox, copy-paste the 4 command lines below, and press Enter:"),
    ("Terminal এ <strong>dns-name</strong> আসবে (যেমন: <code className=\"text-sky-600 font-bold\">6c3b01xxxxxx.sn.mynetname.net</code>)। এই ডোমেনটি আপনার এই অ্যাপের রাউটার IP বক্সে পেস্ট করে সেভ করুন!",
     "The Terminal will return a <strong>dns-name</strong> (e.g. <code className=\"text-sky-600 font-bold\">6c3b01xxxxxx.sn.mynetname.net</code>). Copy and paste this domain into the router IP field in this app!"),
    ("পদ্ধতি ২: Real Public IP ব্যবহার করা", "Method 2: Use Real Public IP"),
    ("আপনার আপস্ট্রিম আইকোর/আইএসপি থেকে পাওয়া রিয়েল পাবলিক আইপি রাউটার আইপিতে বসিয়ে দিন এবং WinBox এর <code>IP -&gt; Services -&gt; api</code> (Port 8728) অন রাখুন।",
     "Enter the public WAN IP assigned by your upstream ISP and ensure <code>IP -&gt; Services -&gt; api</code> (Port 8728) is enabled in WinBox."),
    ("পদ্ধতি ৩: অফলাইন স্টেজিং / সিমুলেশন মোড", "Method 3: Offline Staging / Simulation Mode"),
    ("যদি আপনার কাছে এখনই পাবলিক আইপি না থাকে, আপনি নিশ্চিন্তে এই ডেমো/স্টেজিং মোডে ক্লায়েন্ট ম্যানেজ, বিল তৈরি, হটস্পট ভাউচার এবং ট্রাফিক গ্রাফ টেস্ট করতে পারবেন।",
     "If you do not have a public IP yet, you can test client management, billing invoices, hotspot vouchers, and traffic graphs in Demo/Staging Mode."),
    ("কে অফলাইন স্টেজিং মোডে কানেক্ট করা হয়েছে!", "connected in Offline Staging Mode!"),
    ("স্টেজিং মোডে কানেক্ট করুন (Force Connect)", "Connect in Staging Mode (Force Connect)"),
    ("বুঝেছি (Got It)", "Got It"),
])

# 11. Notifications.tsx
replace_in_file("src/components/pages/Notifications.tsx", [
    ("item.text.includes('মেয়াদ')", "item.text.includes('Expiry')"),
])

# 12. RevenueTracker.tsx
replace_in_file("src/components/pages/RevenueTracker.tsx", [
    ("চলতি Monthের প্রতিদিনের আয়ের গ্রাফ", "Daily Income Graph of Current Month"),
    ("প্রতিদিনের বারে ক্লিক করে সংশ্লিষ্ট দিনের Collection Detailsী দেখুন।", "Click any daily bar to view that day collection breakdown."),
    ("সাধারণ দিন", "Regular Day"),
    ("আজকের দিন", "Today"),
    ("পিক Collection দিন", "Peak Collection Day"),
    ("সর্বTotal Collection", "Total Collection"),
    ("গড় Monthিক Collection", "Monthly Average Collection"),
    ("প্রতিদিনের Collection গ্রাফ:", "Daily Collection Graph:"),
    ("হটস্পট Voucher", "Hotspot Voucher"),
    ("Date)", "Date)"),
    ("Monthের", "Month"),
])

print("Translation replacements complete.")
