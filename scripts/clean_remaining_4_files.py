import re
import os

def clean_file(filepath, replacements):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    orig = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != orig:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Cleaned {filepath}")

# 1. BillingPage.tsx
clean_file("src/components/pages/BillingPage.tsx", [
    ("গ্রাহক খুঁজুন (নাম, মোবাইল, আইডি, ইনভয়েস)...", "Search invoices (Name, Mobile, ID, Invoice #)..."),
    ("পরিশোধের মেথড", "Payment Method"),
    ("সকল মেথড", "All Methods"),
    ("টাকা জমা ও নবায়ন করুন (Record Payment & Renew)", "Record Payment & Renew"),
    ("নতুন বিলিং ইনভয়েস জেনারেটর (Generate Invoice)", "Generate Billing Invoice"),
    ("মাসিক নিয়মিত বিল", "Monthly Regular Bill"),
    ("নতুন সংযোগ ফি", "New Installation Fee"),
    ("প্যাকেজ পরিবর্তন", "Package Upgrade / Change"),
    ("রাউটার বা ক্যাবল ক্রয়", "Router / Hardware Purchase"),
    ("বকেয়া বিল পরিশোধ", "Due Bill Collection"),
    ("অন্যান্য চার্জ", "Other Charges"),
    ("পরিশোধ গ্রহণ ও ইনভয়েস আপডেট", "Collect Payment & Update Invoice"),
    ("পরিশোধের পরিমাণ (৳)", "Paid Amount (৳)"),
    ("ক্যাশ গ্রহণ", "Hand Cash"),
    ("বিকাশ মার্চেন্ট / পার্সোনাল", "bKash Merchant / Personal"),
    ("নগদ মার্চেন্ট", "Nagad Merchant"),
    ("রকেট একাউন্ট", "Rocket Account"),
    ("ব্যাংক ট্রান্সফার", "Bank Transfer"),
    ("অনলাইন গেটওয়ে", "Online Gateway"),
    ("পেমেন্ট ট্রানজেকশন আইডি (TrxID)", "Payment Transaction ID (TrxID)"),
    ("মন্তব্য / নোট (ঐচ্ছিক)", "Remarks / Note (Optional)"),
    ("পেমেন্ট সাবমিট ও রশিদ তৈরি করুন", "Submit Payment & Generate Receipt"),
    ("মুদ্রণ ও মানি রিসিট", "Print Money Receipt"),
    ("গ্রাহকের স্বাক্ষর", "Subscriber Signature"),
    ("কর্তৃপক্ষের স্বাক্ষর", "Authorized Signature"),
    ("আপনার সময়োপযোগী বিল পরিশোধের জন্য ধন্যবাদ!", "Thank you for paying your bill on time!"),
    ("কোনো ইনভয়েস বা পেমেন্ট রেকর্ড খুঁজে পাওয়া যায়নি।", "No invoices or payment records found."),
])

# 2. ClientDashboard.tsx
clean_file("src/components/pages/ClientDashboard.tsx", [
    ("মার্চেন্ট বা সেন্ড মানি নাম্বার:", "Merchant / Payment Number:"),
    ("কপি হয়েছে!", "Copied!"),
    ("নাম্বার কপি করুন", "Copy Number"),
    ("কপি করুন", "Copy"),
    ("মোট প্রদেয় বিল:", "Total Payable Bill:"),
    ("Send Money করুন। এরপর পাওয়া TrxID দিয়ে নিচে সাবমিট করুন।", "Send Money and enter the TrxID below to submit."),
    ("পেমেন্ট TrxID সাবমিট", "Submit Payment TrxID"),
    ("Secure checkout (তাত্ক্ষণিক পেমেন্ট)", "Secure Checkout (Instant Payment)"),
    ("Issue Category / ধরণ", "Issue Category"),
    ("No Internet (ইন্টারনেট চলছে না)", "No Internet (Connection Down)"),
    ("Slow Speed (ধীর গতি)", "Slow Speed (Low Bandwidth)"),
    ("Router Problem (রাউটার সমস্যা)", "Router Problem"),
    ("Payment Issue (পেমেন্ট বকেয়া সংক্রান্ত)", "Payment Issue (Billing/Due)"),
    ("Other (অন্যান্য)", "Other"),
    ("Subject / সমস্যা", "Subject / Summary"),
    ("যেমন: রাউটারে লাল বাতি জ্বলছে", "e.g. Red light on router / LOS"),
    ("Detail Description / বিস্তারিত Description", "Detail Description"),
    ("আপনার সমস্যাটি বিস্তারিত লিখুন, কোন পোল বা রাউটারে সমস্যা হচ্ছে ইত্যাদি...", "Describe your issue in detail..."),
    ("My Ticket Logs (আমার অভিযোগের রেকর্ডসমূহ)", "My Ticket Logs"),
    ("আপনার কোনো টিকিট রেকর্ড নেই।", "No ticket records found."),
    ("কোনো বিলিং রশিদ পাওয়া যায়নি।", "No billing receipts found."),
    ("প্রদেয় বিল:", "Payable Bill:"),
    ("টাকা", "BDT"),
    ("উপরে দেওয়া নম্বরে", "After sending payment to"),
    ("টাকা Sendোর পর প্রাপ্ত", "enter the received"),
    ("Sender Mobile Number (আপনার নম্বর)", "Sender Mobile Number (Your Number)"),
    ("PROCEED / নিশ্চিত করুন", "PROCEED / CONFIRM"),
    ("পেমেন্ট রিকোয়েস্ট জমা হয়েছে!", "Payment Request Submitted!"),
    ("আপনার পেমেন্ট ভেরিফিকেশনের জন্য এডমিনের কাছে Sendো হয়েছে। এডমিন অনুমোদন (Accept) করার সাথে সাথে আপনার ইন্টারনেট Package নবায়ন হয়ে যাবে।", 
     "Your payment has been submitted for admin verification. Once approved, your internet package will be renewed immediately."),
    ("Internet Subscription Renewal (ব্যান্ডউইথ রিচার্জ)", "Internet Subscription Renewal (Bandwidth Recharge)"),
])

# 3. Clients.tsx
clean_file("src/components/pages/Clients.tsx", [
    ("নির্ধারিত Expiry:", "Scheduled Expiry:"),
    ("১ মাস", "1 Month"),
    ("২ মাস", "2 Months"),
    ("৩ মাস", "3 Months"),
    ("৬ মাস", "6 Months"),
    ("১ বছর", "1 Year"),
    ("📅 কাস্টম Date", "📅 Custom Date"),
    ("নতুন Date বেছে নিন:", "Pick New Date:"),
    ("সেভ করুন", "Save"),
    ("গ্রাহক", "Subscriber"),
    ("-এর Expiry আরও", " validity extended by"),
    ("Add Daysো হয়েছে", "days"),
    ("এবং লাইন অনলাইন চালু করা হয়েছে!", "and connection is set online!"),
    ("-এর নতুন Expiry", " new expiry set to"),
    ("নির্ধারণ করা হয়েছে!", "successfully!"),
    ("নতুন হটস্পট Package রিকুয়েস্ট", "New Hotspot Package Requests"),
    ("টি পেন্ডিং", "Pending"),
    ("ক্লায়েন্ট এক্সেস পয়েন্টে কানেক্ট হয়ে পোর্টালে ফর্ম পূরণ করেছে। নিচে \"আইডি তৈরি করুন ও SMS Send\" বাটনে ক্লিক করে একাউন্ট এক্টিভ করুন।",
     "Client requested package via hotspot portal. Click \"Create ID & Send SMS\" below to activate account."),
    ("ID তৈরি করুন ও SMS Send", "Create ID & Send SMS"),
    ("সাবস্ক্রিপশন Expiry শেষ নোটিফিকেশন", "Subscription Expiration Notices"),
    ("জন গ্রাহক", "Subscribers"),
    ("নিচের গ্রাহকদের Packageের মেয়াদ ৩ days বা তার কম সময়ের মধ্যে শেষ হচ্ছে। তাদের সরাসরি এসএমএস রিমাইন্ডার পাঠিয়ে বিল সংগ্রহ নিশ্চিত করুন।",
     "The following subscribers have 3 days or less before expiration. Send an instant SMS reminder to collect bill."),
    ("+ আরও", "+ View"),
    ("জন মেয়াদোত্তীর্ণ গ্রাহক দেখতে ক্লিক করুন", "more expired subscribers"),
    ("আপনি কি নিশ্চিত যে সকল ক্লায়েন্ট লিস্ট ডাটা সম্পূর্ণ মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to delete all client data? (Hard Reset)"),
    ("মোবাইল", "Mobile"),
    ("রাউটার", "Router"),
    ("ক্লিক করে অনলাইন/অফলাইন টগল করুন", "Click to toggle Online/Offline"),
    ("অফলাইন করতে ক্লিক করুন", "Click to set Offline"),
    ("অনলাইন করতে ক্লিক করুন", "Click to set Online"),
    ("লাইন সাময়িকভাবে Close (Pause / Suspend Line)", "Temporarily Suspend Line (Pause Line)"),
    ("লাইন চালু করুন (Play / Active Line)", "Reactivate Line (Active Line)"),
    ("শুধুমাত্র ১ টি মোবাইল কানেকশন পাবে।", "Only 1 mobile device will connect."),
    ("রাউটার কানেক্টেড সমস্ত ডিভাইস ইন্টারনেট পাবে।", "All router connected devices will access internet."),
    ("Package (Package নির্বাচন)", "Package (Select Package)"),
    ("ডিফল্ট: ৳", "Default: ৳"),
    ("নির্দিষ্ট days যোগ করুন:", "Add Specific Days:"),
    ("সঠিক daysের সংখ্যা লিখুন", "Enter a valid number of days"),
    ("days Expiry যোগ করা হয়েছে", "days validity added"),
    ("+ days যোগ করুন", "+ Add Days"),
    ("প্রোফাইল", "Profile"),
    ("অনুযায়ী Expiry নির্ধারণ:", "validity set to:"),
])

# 4. DaysProfile.tsx
clean_file("src/components/pages/DaysProfile.tsx", [
    ("পরিবর্তন Save Profile", "Save Profile Changes"),
    ("আপনি কি নিশ্চিত যে", "Are you sure you want to delete"),
    ("Are you sure you want to delete", "Are you sure you want to delete"),
])

print("Cleaned remaining 4 files.")
