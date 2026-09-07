import re
import os

def update(filepath, pairs):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath}")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()
    orig = text
    for old, new in pairs:
        text = text.replace(old, new)
    if text != orig:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Updated {filepath}")

# 1. BillingPage.tsx
update("src/components/pages/BillingPage.tsx", [
    ("টাকা জমা নিন", "Collect Payment"),
    ("গ্রাহক খুঁজুন...", "Search invoices..."),
    ("পরিশোধিত", "Paid"),
    ("বকেয়া", "Unpaid"),
    ("আংশিক", "Partial"),
    ("বাতিল", "Cancelled"),
    ("কোনো ইনভয়েস পাওয়া যায়নি।", "No invoices found."),
    ("ইনভয়েস তৈরি", "Create Invoice"),
    ("বিলিং তালিকা", "Billing List"),
    ("ইনভয়েস নং", "Invoice #"),
    ("গ্রাহকের নাম ও আইডি", "Subscriber Name & ID"),
    ("প্যাকেজ ও বিবরণ", "Package & Details"),
    ("বিল পরিমাণ", "Amount"),
    ("পরিশোধিত পরিমাণ", "Paid Amount"),
    ("ইস্যু তারিখ", "Issue Date"),
    ("পরিশোধের শেষ তারিখ", "Due Date"),
    ("পেমেন্ট গ্রহণ করুন", "Collect Payment"),
    ("মানি রিসিট প্রিন্ট", "Print Receipt"),
    ("ইনভয়েস দেখুন", "View Invoice"),
    ("ইনভয়েস বিবরণ", "Invoice Details"),
    ("পেমেন্ট মেথড", "Payment Method"),
    ("বিলিং সাইকেল", "Billing Cycle"),
    ("পেমেন্ট স্ট্যাটাস", "Payment Status"),
    ("ক্যাশ", "Cash"),
    ("বিকাশ", "bKash"),
    ("নগদ", "Nagad"),
    ("রকেট", "Rocket"),
    ("ব্যাংক", "Bank"),
    ("পরিশোধিত তারিখ", "Paid Date"),
    ("নোট", "Note"),
    ("সংরক্ষণ", "Save"),
    ("বন্ধ", "Close"),
])

# 2. ClientDashboard.tsx
update("src/components/pages/ClientDashboard.tsx", [
    ("অভিযোগ সাবমিট করা হয়েছে। অ্যাডমিন টিম দ্রুত কাজ শুরু করবে!", "Ticket submitted successfully! Support team will inspect shortly."),
    ("টিকেট সাবমিট করতে ত্রুটি হয়েছে।", "Failed to submit ticket."),
    ("দয়া করে আপনার Mobile Number লিখুন!", "Please enter your Mobile Number!"),
    ("দয়া করে পেমেন্টের Transaction ID (TrxID) লিখুন!", "Please enter the payment Transaction ID (TrxID)!"),
    ("পেমেন্ট রিনিউয়াল আবেদন পাঠানো হয়েছে! এডমিন যাচাই করে লাইন সচল করবেন।", "Payment renewal request submitted! Admin will verify and activate your connection."),
    ("আবেদন পাঠাতে ত্রুটি হয়েছে।", "Error submitting request."),
    ("পেমেন্ট গেটওয়ে", "Payment Gateway"),
    ("সহায়তা", "Help & Support"),
])

# 3. Clients.tsx
update("src/components/pages/Clients.tsx", [
    ("Upload Speed (আপলোড Mbps)", "Upload Speed (Upload Mbps)"),
    ("Download Speed (ডাউনলোড Mbps)", "Download Speed (Download Mbps)"),
    ("⚡ MikroTik Queue Config (বার্স্ট স্পিড ও প্রায়োরিটি)", "⚡ MikroTik Queue Config (Burst Speed & Priority)"),
    ("Burst Speed (বার্স্ট স্পিড)", "Burst Speed"),
    ("Priority Level (প্রায়োরিটি - queue priority 1-8)", "Priority Level (Queue Priority 1-8)"),
    ("1 - 👑 VIP Priority (ভিআইপি ক্লায়েন্ট - ১)", "1 - 👑 VIP Priority (VIP Client - 1)"),
    ("8 - 🏠 Local Client Priority (লোকাল ক্লায়েন্ট - ৮)", "8 - 🏠 Local Client Priority (Local Client - 8)"),
    ("👑 VIP Client: সর্বোচ্চ ব্যান্ডউইথ প্রায়োরিটি ১ পাবে।", "👑 VIP Client: Receives highest bandwidth priority 1."),
    ("🏠 Local Client: সাধারণ লোকাল ক্লায়েন্ট স্ট্যান্ডার্ড প্রায়োরিটি ৮।", "🏠 Local Client: Standard client priority 8."),
    ("Days Profile & Validity / Expiry Date (মেয়াদের প্রোফাইল ও Expiry Date) *", "Days Profile & Validity / Expiry Date *"),
    ("-- মেয়াদের প্রোফাইল সিলেট করুন (Select Days Profile) --", "-- Select Days Profile --"),
    ("দিন গ্রেস", "days grace"),
    ("দিন", "days"),
    ("MikroTik Router Node (রাউটার নোড) *", "MikroTik Router Node *"),
    ("Device Target Option (ব্যবহারের ধরন)", "Device Target Option"),
    ("মোবাইল এক্সেস", "Mobile Access"),
    ("১ টি মোবাইল সংযোগ।", "Single mobile connection."),
    ("রাউটার এক্সেস", "Router Access"),
    ("রাউটার শেয়ারড এক্সেস।", "Shared Wi-Fi router access."),
    ("-- কাস্টম Package (Custom Package) --", "-- Custom Package --"),
    ("Custom Package Price (কাস্টম Package প্রাইস)", "Custom Package Price"),
    ("৳ টাকা", "BDT"),
    ("📶 Custom Bandwidth & Speeds (কাস্টম ব্যান্ডউইথ ও স্পিড)", "📶 Custom Bandwidth & Speeds"),
    ("-- কাস্টম স্পিড (Custom Speed) --", "-- Custom Speed --"),
    ("Expiry নিয়ন্ত্রণ ও বাড়ানোর প্যানেল (Expiry Control & Extension)", "Expiry Control & Extension Panel"),
    ("⚡ দ্রুত Expiry বাড়ান (Quick Extend From Today or Current):", "⚡ Quick Extend Validity:"),
    ("{ label: '+৭ দিন', days: 7 }", "{ label: '+7 Days', days: 7 }"),
    ("{ label: '+১৫ দিন', days: 15 }", "{ label: '+15 Days', days: 15 }"),
    ("{ label: '+৩০ দিন (১ মাস)', days: 30 }", "{ label: '+30 Days (1 Month)', days: 30 }"),
    ("{ label: '+৬০ দিন (২ মাস)', days: 60 }", "{ label: '+60 Days (2 Months)', days: 60 }"),
    ("{ label: '+৯০ দিন (৩ মাস)', days: 90 }", "{ label: '+90 Days (3 Months)', days: 90 }"),
    ("{ label: '+১৮০ দিন (৬ মাস)', days: 180 }", "{ label: '+180 Days (6 Months)', days: 180 }"),
    ("{ label: '+৩৬৫ দিন (১ বছর)', days: 365 }", "{ label: '+365 Days (1 Year)', days: 365 }"),
    ("Expiry আরও ${item.days} Add Daysো হয়েছে (${newTarget})", "Expiry extended by ${item.days} days (${newTarget})"),
    ("Expiry আজকের Dateে সেট করা হয়েছে (আজই এক্সপায়ার হবে)", "Expiry set to today (expires today)"),
    ("আজই শেষ (Today)", "Expires Today"),
    ("নির্দিষ্ট দিন যোগ করুন:", "Add Specific Days:"),
    ("যেমন: 45", "e.g. 45"),
    ("সঠিক দিনের সংখ্যা লিখুন", "Please enter a valid number of days"),
    ("${num} দিন Expiry যোগ করা হয়েছে (${newTarget})", "${num} days added to validity (${newTarget})"),
    ("+ দিন যোগ করুন", "+ Add Days"),
    ("অথবা Expiryের প্রোফাইল নির্বাচন করুন:", "Or select a Validity Profile:"),
    ("প্রোফাইল ${found.name} অনুযায়ী Expiry নির্ধারণ: ${found.days} দিন", "Expiry set to ${found.days} days according to profile ${found.name}"),
    ("-- Expiryের প্রোফাইল দিয়ে সেট করুন --", "-- Set using Validity Profile --"),
    ("📅 ক্যালেন্ডার থেকে সরাসরি Date নির্বাচন:", "📅 Select Date directly from Calendar:"),
    ("মূল Expiry:", "Original Expiry:"),
    ("নতুন Expiry:", "New Expiry:"),
    ("✓ ভবিষ্যতে থাকলে সেভ করার সাথে সাথে লাইন অটো-অনলাইন হবে", "✓ Setting a future date will reactivate the line automatically upon saving"),
    ("Burst Speed (বার্স্ট স্পিড)", "Burst Speed"),
    ("Priority (প্রায়োরিটি)", "Priority"),
    ("Send SMS Reminder (মেসেজ Send)", "Send SMS Reminder"),
    ("Username (ইউজার):", "Username:"),
    ("🔒 ১ টি মাত্র মোবাইলে এক্টিভেট হবে (MAC Lock Locked)", "🔒 Active on 1 mobile device only (MAC Locked)"),
    ("📶 রাউটার কানেকশন (শেয়ারড এক্সেস)", "📶 Wi-Fi Router Connection (Shared Access)"),
])

# 4. DaysProfile.tsx
update("src/components/pages/DaysProfile.tsx", [
    ("যেমন: ৩০ daysের নিয়মিত মান্থলি, ৭ daysের ট্রায়াল...", "e.g. 30 Days Monthly Regular, 7 Days Trial..."),
    ("ডিভাইসের টাইপ পছন্দ (Device Target)", "Device Target Type"),
    ("শুধুমাত্র Mobile (Mobile Access)", "Mobile Only (Mobile Access)"),
    ("শুধুমাত্র Router (Router Access)", "Router Only (Router Access)"),
    ("যেমন: ১ মাসের স্ট্যান্ডার্ড ব্রডব্যান্ড কানেকশন...", "e.g. Standard 1-month broadband subscription..."),
    ("ডিফল্ট মেয়াদের প্রোফাইল হিসেবে সেট করুন (Set as Default)", "Set as Default Validity Profile"),
    ("সেভ করুন", "Save Profile"),
    ("ডিভাইসের টাইপ", "Device Target"),
    ("ডিফল্ট মেয়াদের প্রোফাইল হিসেবে সেট করুন", "Set as Default Profile"),
    ("পরিবর্তন সেভ করুন", "Save Changes"),
    ("title=\"প্রোফাইল মুছুন\"", "title=\"Delete Profile\""),
    ("মুছতে চান?", "Are you sure you want to delete"),
    ("হ্যাঁ, Delete", "Yes, Delete"),
])

# 5. Hotspot.tsx
update("src/components/pages/Hotspot.tsx", [
    ("পেমেন্ট গেটওয়ে &amp; TrxID:", "Payment Gateway & TrxID:"),
    ("প্রিয়", "Dear"),
    ("Welcome to Nexora network!", "Welcome to Nexora network!"),
    ("Your Hotspot User ID:", "Your Hotspot User ID:"),
    ("Password:", "Password:"),
    ("Login Portal:", "Login Portal:"),
    ("🟢 WhatsApp এ Send", "🟢 Send via WhatsApp"),
    ("সফলভাবে একটিভ ও অনুমোদন করা হয়েছে!", "activated and approved successfully!"),
    ("একটিভ করুন &amp; গ্রাহক আইডি সেভ করুন", "Activate & Save Client ID"),
])

# 6. RevenueTracker.tsx
update("src/components/pages/RevenueTracker.tsx", [
    ("টি transactions", " transactions"),
    ("১২ Month সম্মিলিত Total Collection", "12 Months Combined Total Collection"),
])

print("Final sweep completed.")
