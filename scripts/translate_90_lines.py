import re
import os

def clean(filepath, pairs):
    if not os.path.exists(filepath):
        print(f"Skipping missing file: {filepath}")
        return
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()
    orig = text
    for old, new in pairs:
        text = text.replace(old, new)
    if text != orig:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Cleaned {filepath}")

# 1. AdminProfile.tsx
clean("src/components/AdminProfile.tsx", [
    ("ডেমো মোডে এডমিনের ইউজারনেম পরিবর্তন করা যাবে না!", "Admin username cannot be changed in demo mode!"),
    ("প্রোফাইল পিকচার সিলেক্ট করা হয়েছে। নিচে সেভ বাটনে ক্লিক করুন।", "Profile picture selected. Click Save button below."),
    ("Password কনফার্মেশন মিলছে না!", "Password confirmation does not match!"),
    ("Change Password সফল হয়েছে!", "Password changed successfully!"),
    ("অ্যাডমিনিস্ট্রেটর অ্যাকাউন্ট তথ্য, সিকিউরিটি ক্রেডেনশিয়াল ও ডিভাইস সেশন কন্ট্রোল।", "Administrator account details, security credentials, and device session control."),
    ("Address / ঠিকানা", "Address"),
])

# 2. AuditLogs.tsx
clean("src/components/pages/AuditLogs.tsx", [
    ("আপনি কি নিশ্চিত যে সমস্ত সিস্টেম অডিট লগ মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to clear all system audit logs? (Hard Reset)"),
])

# 3. Bandwidth.tsx
clean("src/components/pages/Bandwidth.tsx", [
    ("আপনি কি নিশ্চিত যে সমস্ত ব্যান্ডউইথ প্রোফাইল মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to reset all bandwidth profiles? (Hard Reset)"),
    ("মোবাইল এক্সেস (১ টি ডিভাইস)", "Mobile Access (1 Device)"),
    ("রাউটার এক্সেস (সবাই শেয়ার করবে)", "Router Access (Shared by all)"),
    ("Dynamic Day/Night Speed Scheduler (ডায়নামিক স্পিড শিডিউলার)", "Dynamic Day/Night Speed Scheduler"),
    ("স্বয়ংক্রিয়ভাবে নির্দিষ্ট সময়ের ব্যবধানে গ্রাহকদের ব্যান্ডউইথ বুস্ট করুন (যেমন: অফ-পিক আওয়ারে ১.৫ গুণ বেশি স্পিড)।", "Automatically boost subscriber bandwidth during off-peak hours (e.g., 1.5x speed at night)."),
    ("দিনের পক আওয়ারে গ্রাহকরা তাদের নির্ধারিত মূল Package স্পিড (যেমন ১০ এমবিপিএস) পাবেন।", "Subscribers receive regular package speed during peak daytime hours."),
    ("রাত ১১টা থেকে সকাল ৯টা পর্যন্ত গ্রাহকদের প্রোফাইল স্বয়ংক্রিয়ভাবে <span className=\"font-bold text-indigo-500\">১.৫ গুণ বৃদ্ধি</span> করা হবে।",
     "From 11 PM to 9 AM, subscriber bandwidth is automatically boosted by <span className=\"font-bold text-indigo-500\">1.5x</span>."),
    ("মাস্টার রি-শিডিউলিং ক্রন-টাস্ক এডিট করুন:", "Edit master rescheduling cron-task:"),
    ("Device Target Option (ব্যবহারের ধরন) *", "Device Target Option *"),
    ("Device Target Option (ব্যবহারের ধরন)", "Device Target Option"),
    ("মোবাইল এক্সেস", "Mobile Access"),
    ("শুধুমাত্র ১ টি মোবাইল ফোনে এক্টিভ চলবে।", "Active on only 1 mobile phone."),
    ("রাউটার এক্সেস", "Router Access"),
    ("রাউটারে সংযুক্ত সবাই ইন্টারনেট পাবে।", "All router connected devices will get internet access."),
    ("শুধুমাত্র ১ টি মোবাইল কানেকশন।", "Single mobile connection only."),
    ("রাউটার থেকে সবাই এক্সেস করতে পারবে।", "Shared access from router."),
])

# 4. BillingPage.tsx
clean("src/components/pages/BillingPage.tsx", [
    ("Monthly Internet Subscription (মাসিক ইন্টারনেট বিল)", "Monthly Internet Subscription"),
    ("অনুগ্রহ করে একজন Subscriber নির্বাচন করুন", "Please select a subscriber"),
    ("সফলভাবে তৈরি হয়েছে!", "created successfully!"),
    ("কোনো Subscriber পাওয়া যায়নি", "No subscribers found"),
    ("মাসের জন্য সকল Subscriberের ইনভয়েস ইতিমধ্যে তৈরি করা আছে!", "month invoices have already been generated for all subscribers!"),
    ("নির্বাচিত", "For selected"),
    ("মাসের ইনভয়েস স্বয়ংক্রিয়ভাবে তৈরি হয়েছে!", "month invoices created automatically!"),
    ("পেমেন্টের Amount শূন্যের বেশি হতে হবে", "Payment amount must be greater than zero"),
    ("এর জন্য ৳", "for ৳"),
    ("পেমেন্ট রেকর্ড সম্পন্ন!", "payment recorded successfully!"),
    ("সম্মানিত Subscriber", "Dear Subscriber"),
    ("আপনার", "your"),
    ("মাসের ইন্টারনেট বিল ৳", "month internet bill of ৳"),
    ("Dateের মধ্যে পরিশোধ করার অনুরোধ করা হচ্ছে।", "before the due date."),
    ("ধন্যবাদ,", "Thank you,"),
    ("WhatsApp এ রিমাইন্ডার Sendো হচ্ছে...", "Sending reminder via WhatsApp..."),
    ("মোবাইল মেসেজে রিমাইন্ডার Sendো হচ্ছে...", "Sending reminder via SMS..."),
    ("রিমাইন্ডার মেসেজ কপি হয়েছে!", "Reminder message copied!"),
    ("সিস্টেম SMS গেটওয়ে থেকে", "From system SMS gateway to"),
    ("নম্বরে রিমাইন্ডার Sendো হয়েছে!", "reminder has been sent!"),
    ("কোনো ইনভয়েস ডাটা পাওয়া যায়নি", "No invoice data found"),
    ("সফলভাবে", "Successfully exported"),
    ("Invoices CSV ফাইলে ডাউনলোড করা হয়েছে!", "invoices to CSV!"),
    ("Billing & Invoicing Panel (বিলিং ও ইনভয়েস)", "Billing & Invoicing Panel"),
    ("Subscriberদের মাসিক Packageের ভিত্তিতে Create Invoice, বিল Status (Paid/Pending/Overdue) মনিটরিং এবং SMS/WhatsApp পেমেন্ট রিমাইন্ডার Send।",
     "Generate subscriber monthly package invoices, monitor payment statuses (Paid/Pending/Overdue), and send SMS/WhatsApp payment reminders."),
    ("আপনি কি নিশ্চিত যে সমস্ত ইনভয়েস ও বিলিং রেকর্ড মুছে ফেলে নতুনভাবে শুরু করতে চান?", "Are you sure you want to clear all invoice and billing records? (Hard Reset)"),
    ("Total Invoiced (মোট বিল)", "Total Invoiced"),
    ("মোট ইনভয়েস", "total invoices"),
    ("Paid / Collected (আদায়কৃত)", "Paid / Collected"),
    ("Invoicesের জন্য Subscriberদের Mobile Numberে পেমেন্ট রিমাইন্ডার পাঠাতে চান?", "invoices to subscriber mobile numbers?"),
    ("Create New Invoice করতে ওপরের &quot;Create Custom Invoice&quot; অথবা &quot;Bulk Monthly Invoices&quot; বাটনে ক্লিক করুন।",
     "To generate an invoice, click &quot;Create Custom Invoice&quot; or &quot;Bulk Monthly Invoices&quot; above."),
    ("ইনভয়েস", "Invoice"),
    ("টাকা", "BDT"),
])

# 5. ClientDashboard.tsx
clean("src/components/pages/ClientDashboard.tsx", [
    ("After sending payment to ({merchantPaymentNumber}) BDT Sendোর পর প্রাপ্ত <span className=\"font-black underline\">Transaction ID (TrxID)</span> below:",
     "After sending payment to ({merchantPaymentNumber}), enter the received <span className=\"font-black underline\">Transaction ID (TrxID)</span> below:"),
])

print("Translation round finished.")
