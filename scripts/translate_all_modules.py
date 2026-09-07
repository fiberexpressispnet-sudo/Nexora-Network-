import re
import glob

def process_files():
    # Translation rules per file or globally
    rules = [
        # Common UI & Buttons
        ("নতুন অ্যাপ ডাটা রিসেট", "Fresh App Data Reset"),
        ("System Reset / নতুন অ্যাপ ডাটা রিসেট", "System Reset / Fresh App Data Reset"),
        ("আপনি যদি ক্লায়েন্ট লিস্ট, পেমেন্ট রেকর্ড এবং আইএসপি মডিউল ডেটা নতুনভাবে শুরু করতে চান, তবে নিচে ক্লিক করে সমস্ত ডেমো বা পুরোনো তথ্য পরিষ্কার করে শূন্য (0) থেকে শুরু করতে পারেন।", 
         "If you want to start fresh with client lists, payment records, and ISP module data, click below to clear all demo or legacy data and start from zero (0)."),
        ("আপনি কি নিশ্চিত যে সমস্ত পুরানো ক্লায়েন্ট ও ডেমো তথ্য মুছে ফেলে একদম নতুন অ্যাপ হিসাবে শুরু করতে চান?", 
         "Are you sure you want to delete all existing client & demo data and start as a completely fresh app?"),
        ("পিন কোড ও পাসওয়ার্ড নিরাপত্তা (PIN & Password Lock)", "PIN Code & Password Security (PIN & Password Lock)"),
        ("পিন কোড ও পাসওয়ার্ড নিরাপত্তা", "PIN Code & Password Security"),
        ("পিন লক সক্রিয়", "PIN Lock Enabled"),
        ("লক নিষ্ক্রিয়", "PIN Lock Disabled"),
        ("যেকোনো মোবাইল বা ব্রাউজার থেকে অ্যাপ ওপেন করার সাথে সাথে সরাসরি ৪-৬ ডিজিটের <strong>অ্যাডমিন পিন পাসওয়ার্ড</strong> চাইবে। আপনার সেট করা পিন কোড দিয়ে শুধুমাত্র আপনিই সিস্টেমে প্রবেশ করতে পারবেন।", 
         "Whenever the app is opened from any mobile or browser, it will prompt for the 4-8 digit <strong>Admin Security PIN</strong>. Only you can enter the system with your configured PIN."),
        ("পিন কোড ও নিরাপত্তা কনফিগারেশন", "PIN Code & Security Configuration"),
        ("অ্যাপ স্টার্টআপে পিন লক আবশ্যক", "PIN lock required on app startup"),
        ("ব্যাকআপ রিকভারি পিন (Emergency PIN)", "Backup Recovery PIN (Emergency PIN)"),
        ("গোপন রিকভারি পিন লিখুন", "Enter secret recovery PIN"),
        ("জরুরী ব্যাকআপ রিকভারি পিন", "Emergency Backup Recovery PIN"),

        # Security Page
        ("নতুন পাসওয়ার্ড এবং নিশ্চিতকরণ মিলছে না!", "New password and confirmation do not match!"),
        ("অ্যাডমিন পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!", "Admin password updated successfully!"),
        ("সম্পূর্ণ ডাটাবেজ ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!", "Complete database backup file downloaded successfully!"),
        ("সিস্টেম ব্যাকআপ ডাটা সফলভাবে রিস্টোর করা হয়েছে!", "System backup data restored successfully!"),
        ("অবৈধ ব্যাকআপ ফাইল ফরমেট!", "Invalid backup file format!"),
        ("ডাটাবেজ ব্যাকআপ ও রিস্টোর হাব", "Database Backup & Restore Hub"),
        ("আপনার সমস্ত ক্লায়েন্ট লিস্ট, প্যাকেজ, মাইক্রোটিক হিসাব, পেমেন্ট ট্রানজেকশন ও সিস্টেম সেটিংসের একটি একক JSON ফাইল ব্যাকআপ।", 
         "A single JSON file backup of all subscriber lists, packages, MikroTik configurations, payment transactions, and system settings."),
        ("পূর্বে ডাউনলোড করা কোনো JSON ব্যাকআপ ফাইল আপলোড করে পূর্বাবস্থায় ফিরিয়ে আনুন।", 
         "Restore previous state by uploading a previously downloaded JSON backup file."),

        # SMS Notification Page
        ("সম্মানিত গ্রাহক, আপনার Nexora network ইন্টারনেট বিল বকেয়া রয়েছে। নিরবচ্ছিন্ন সেবার জন্য দ্রুত বিল পরিশোধ করুন। ধন্যবাদ।", 
         "Dear subscriber, your Nexora network internet bill is due. Please pay promptly to enjoy uninterrupted service. Thank you."),
        ("অনুগ্রহ করে মেসেজ লিখুন।", "Please enter a message text."),
        ("নির্বাচিত ক্যাটাগরিতে কোনো গ্রাহক নেই।", "No subscribers found in the selected category."),
        ("সফলভাবে ${recipients.length} জন গ্রাহককে বাল্ক SMS পাঠানো হয়েছে! (Sender: ${gatewayConfig.senderId})", 
         "Successfully dispatched bulk SMS to ${recipients.length} subscribers! (Sender: ${gatewayConfig.senderId})"),
        ("অটোমেটিক বিলিং SMS, মেয়াদোত্তীর্ণ সতর্কতা, হোয়াটসঅ্যাপ ডিরেক্ট মেসেজ ও বাল্ক নোটিফিকেশন ইঞ্জিন।", 
         "Automated billing SMS, expiry alerts, WhatsApp direct messaging, and bulk notification engine."),
        ("যেকোনো ক্লায়েন্টকে সরাসরি WhatsApp Web বা অ্যাপের মাধ্যমে কাস্টম নোটিফিকেশন পাঠাতে পারবেন।", 
         "Send custom notifications directly to any client via WhatsApp Web or mobile app."),
        ("`সম্মানিত ${client.name}, আপনার Nexora network ইন্টারনেট সংযোগের বিষয়ে জরুরি বার্তা।`", 
         "`Dear ${client.name}, important update regarding your Nexora network internet service.`"),
        ("নিচের ইভেন্টগুলো ঘটলে সিস্টেম নিজে থেকেই তাৎক্ষণিকভাবে সংশ্লিষ্ট গ্রাহককে SMS অ্যালার্ট পাঠাবে।", 
         "When the following events occur, the system will automatically send instant SMS alerts to the subscriber."),
        ("প্রতি মাসের ১ তারিখে নতুন ইনভয়েস ইস্যু হলে গ্রাহককে মোট বিল জানানো।", "Notify subscriber of total due when monthly invoice is generated on the 1st of each month."),
        ("বিকাশ/নগদ/ক্যাশে টাকা জমা হলে ট্রানজেকশন আইডিসহ ডিজিটাল মানি রিসিট।", "Instant digital money receipt with transaction ID upon receiving payment via bKash/Nagad/Cash."),
        ("বিল পরিশোধের শেষ তারিখের ৩ দিন আগে মৃদু সতর্কবার্তা প্রেরণ।", "Gentle payment reminder sent 3 days before the invoice due date."),
        ("মেয়াদ শেষ হওয়ার পর বকেয়া নোটিশ ও সংযোগ বন্ধের আগাম সতর্কতা।", "Urgent overdue notice and prior warning before line disconnection."),
        ("প্যাকেজের ২৪ ঘণ্টা মেয়াদ বাকি থাকলে অটো-রিমাইন্ডার।", "Automated alert when only 24 hours remain on the package."),
        ("প্যাকেজ রিনিউ ও নতুন ভ্যালিডিটি ডেট কনফার্মেশন SMS।", "Confirmation SMS upon renewal with new validity date."),
        ("অনাদায়ী বিলের জন্য লাইন সাময়িক বন্ধ হলে কারণসহ বার্তা।", "Notification with reason when connection is temporarily suspended for unpaid dues."),
        ("পেমেন্টের পর মাইক্রোটিকে লাইন আনব্লক হওয়ার তাৎক্ষণিক সুখবর।", "Instant alert when connection is unblocked in MikroTik following payment."),
        ("গ্রাহকের অভিযোগ টিকেট সমাধান হলে টেকনিশিয়ানের রিপোর্ট SMS।", "Resolution SMS with technician report when a customer complaint is resolved."),

        # Notifications
        ("অনলাইন পেমেন্ট রিনিউয়াল আবেদন ({pendingBroadbandRenewals.length}টি পেন্ডিং)", "Online Payment Renewal Requests ({pendingBroadbandRenewals.length} Pending)"),
        ("Subscriptions পেইজে যান", "Go to Subscriptions Page"),
        ("পেমেন্ট মেথড:", "Payment Method:"),
        ("সময়:", "Time:"),
        ("ট্রানজেকশন আইডি:", "Transaction ID:"),
        ("প্যাকেজ:", "Package:"),
        ("মূল্য:", "Price:"),
        ("অনুমোদন করুন", "Approve"),
        ("বাতিল করুন", "Reject"),
        ("কোনো পেন্ডিং রিনিউয়াল আবেদন নেই", "No pending renewal requests"),
        ("ব্রডব্যান্ড গ্রাহক স্বয়ংক্রিয়ভাবে বিকাশে বিল দিয়ে আবেদন করলে এখানে জমা হবে।", "When subscribers pay via bKash/Nagad online, their renewal requests will appear here."),

        # Packages Page
        ("আপনি কি নিশ্চিত যে সমস্ত প্যাকেজ লিস্ট মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to reset all packages? (Hard Reset)"),
        ("Hard Reset (ডাটা রিসেট)", "Hard Reset (Reset Data)"),

        # Reports Page
        ("আপনি কি নিশ্চিত যে সকল বিলিং/পেমেন্ট রিপোর্ট ডাটা মুছে ফেলতে চান? (Hard Reset)", "Are you sure you want to clear all billing & payment report data? (Hard Reset)"),

        # Revenue Tracker
        ("অনুগ্রহ করে ক্লায়েন্টের নাম এবং টাকার পরিমাণ সঠিক দিন", "Please enter valid subscriber name and payment amount"),
        ("টাকার রিচার্জ সফলভাবে এন্ট্রি করা হয়েছে!", "recharge payment recorded successfully!"),
        ("এক্সপোর্ট করার মতো কোনো ট্রানজেকশন ডেটা পাওয়া যায়নি", "No transaction data available to export"),
        ("টি ট্রানজেকশনের CSV রিপোর্ট ডাউনলোড হয়েছে!", "transactions CSV report downloaded successfully!"),
        ("লাইভ ইনকাম গ্রাফ ও ১ বছরের রিচার্জ ট্র্যাকার", "Live Income Graph & 1-Year Recharge Tracker"),

        # Network Coverage Map
        ("কোর রাউটার, OLT, অপটিক্যাল স্প্লিটার, ডিস্ট্রিবিউশন বক্স এবং গ্রাহক ফাইবারের লাইভ সিগন্যাল পাওয়ার (-dBm)।",
         "Core router, OLT, optical splitters, distribution boxes, and subscriber fiber live signal power (-dBm)."),
    ]

    files = glob.glob("src/**/*.*", recursive=True)
    for f in sorted(files):
        with open(f, "r", encoding="utf-8") as file:
            text = file.read()
        orig = text
        for k, v in rules:
            text = text.replace(k, v)
        if text != orig:
            with open(f, "w", encoding="utf-8") as file:
                file.write(text)
            print(f"Updated {f}")

process_files()
