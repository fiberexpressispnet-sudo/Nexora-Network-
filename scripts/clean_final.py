import re

def clean_file(path, pairs):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    orig = content
    for old, new in pairs:
        content = content.replace(old, new)
    if content != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Cleaned {path}")

# BillingPage.tsx
clean_file("src/components/pages/BillingPage.tsx", [
    ("টি Paid", "Paid"),
    ("Pending Bills (চলতি Due)", "Pending Bills (Current Due)"),
    ("টি অপেক্ষমান ইনভয়েস", "pending invoices"),
    ("Overdue Bills (মেয়াদোত্তীর্ণ)", "Overdue Bills (Expired)"),
    ("টি বিলের Date পার হয়েছে", "overdue bills past due date"),
    ("placeholder=\"Invoice No, ক্লায়েন্টের নাম, User ID বা মোবাইল...\"", "placeholder=\"Invoice No, Client Name, User ID or Phone...\""),
    ("All Months (সকল মাস)", "All Months"),
    ("টি ইনভয়েস", "Invoices"),
    ("কোনো ইনভয়েস পাওয়া যায়নি", "No invoices found"),
    ("Create New Invoice করতে ওপরের \"Create Custom Invoice\" অথবা \"Bulk Monthly Invoices\" বাটনে ক্লিক করুন।", "To generate an invoice, click \"Create Custom Invoice\" or \"Bulk Monthly Invoices\" above."),
    ("মুছে ফেলতে চান?", "delete?"),
    ("মুছে ফেলা হয়েছে", "deleted successfully"),
    ("Create Custom Invoice (নতুন ইনভয়েস)", "Create Custom Invoice"),
    ("নির্দিষ্ট Subscriberের জন্য কাস্টম বিল তৈরি করুন", "Create custom invoice for specific subscriber"),
    ("Select Client (Subscriber নির্বাচন করুন) *", "Select Subscriber *"),
    ("Billing Month (বিলের মাস) *", "Billing Month *"),
    ("Issue Date (ইস্যু Date) *", "Issue Date *"),
    ("Due Date (পরিশোধের শেষ Date) *", "Due Date *"),
    ("Bill Items Breakdown (আইটেম Descriptionী)", "Bill Items Breakdown"),
    ("Discount (ছাড় ৳):", "Discount (৳):"),
    ("Tax / VAT (ভ্যাট ৳):", "Tax / VAT (৳):"),
    ("Notes / Payment Terms (বিল সংক্রান্ত নির্দেশনা)", "Notes / Payment Terms"),
    ("এক ক্লিকে সকল Subscriberের জন্য Monthly Bill তৈরি", "Generate monthly bills for all subscribers with 1 click"),
    ("Billing Month (কোন মাসের জন্য বিল তৈরি করবেন?) *", "Billing Month *"),
    ("Due Date (লাস্ট ডেট) *", "Due Date *"),
    ("Target Router Node (নির্দিষ্ট রাউটার নোড)", "Target Router Node"),
    ("All Routers (সকল রাউটারের Subscriber)", "All Routers"),
    ("Client Status Target (Subscriberের Status ফিল্টার)", "Client Status Filter"),
    ("All Active / Registered Clients (সকল ক্লায়েন্ট)", "All Active / Registered Clients"),
    ("Online Active Clients Only (শুধুমাত্র অনলাইন ক্লায়েন্ট)", "Online Active Clients Only"),
    ("ℹ️ সিস্টেম প্রতিটি ক্লায়েন্টের Packageের নির্ধারিত রেট (Custom Client Price বা Package Base Price) হিসাব করে স্বয়ংক্রিয়ভাবে ডুপ্লিকেট বাদ দিয়ে Create Invoice করবে।",
     "ℹ️ The system calculates rate per subscriber automatically (Custom Price or Package Base Price) and generates unique non-duplicate invoices."),
    ("Receive Bill Payment (বিল গ্রহণ)", "Receive Bill Payment"),
    ("Received Amount (গৃহীত টাকার Amount ৳) *", "Received Amount (৳) *"),
    ("Payment Method (পেমেন্টের মাধ্যম) *", "Payment Method *"),
    ("Transaction ID / TrxID (ঐচ্ছিক ট্রানজেকশন নম্বর)", "Transaction ID / TrxID (Optional)"),
    ("Bill Collector (বিল আদায়কারী)", "Bill Collector"),
    ("Subscriberের ইন্টারনেট মেয়াদ স্বয়ংক্রিয়ভাবে ১ মাস (৩০ দিন) বৃদ্ধি করুন", "Extend subscriber internet validity automatically by 1 month (30 days)"),
    ("Send Payment Reminder (পেমেন্ট রিমাইন্ডার)", "Send Payment Reminder"),
    ("বাংলা (Bangla)", "Bangla"),
    ("Message Text (মেসেজের Descriptionী)", "Message Text"),
    ("Bulk Reminders (একসাথে সকল Due রিমাইন্ডার)", "Bulk Due Reminders"),
    ("জন Subscriberের Due Bill রিমাইন্ডার", "Subscribers Due Bill Reminders"),
    ("আপনি কি এক ক্লিকে সকল অপেক্ষমান (Pending) এবং মেয়াদোত্তীর্ণ (Overdue)", "Are you sure you want to dispatch SMS payment reminders to all pending & overdue"),
    ("টি ইনভয়েসের জন্য Subscriberদের Mobile Numberে পেমেন্ট রিমাইন্ডার পাঠাতে চান?", "invoices at subscriber mobile numbers?"),
    ("Total Due অ্যামাউন্ট:", "Total Due Amount:"),
    ("ওভারডিউ ইনভয়েস:", "Overdue Invoices:"),
    ("পেন্ডিং ইনভয়েস:", "Pending Invoices:"),
    ("টি", "Invoices"),
    ("জন Due Subscriberকে SMS রিমাইন্ডার কিউতে Sendো হয়েছে!", "due subscribers queued for SMS reminder!"),
    ("Billed To (Subscriberের Descriptionী):", "Billed To (Subscriber Details):"),
    ("Descriptionী", "Details"),
])

# ClientDashboard.tsx
clean_file("src/components/pages/ClientDashboard.tsx", [
    ("লাইন সফলভাবে রিসেট ও সচল করা হয়েছে!", "Line reset and reactivated successfully!"),
    ("অটো-ফিক্স ব্যর্থ হয়েছে। হেল্পলাইনে যোগাযোগ করুন।", "Auto-fix failed. Please contact helpline."),
    ("সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে।", "Failed to communicate with server."),
    ("দিন পূর্বে", "days ago"),
    ("দিন", "days"),
    ("ঘণ্টা", "hours"),
    ("মিনিট", "minutes"),
    ("অনুগ্রহ করে সবগুলো তথ্য পূরণ করুন।", "Please fill in all details."),
    ("আপনার টিকেটটি সফলভাবে সাবমিট করা হয়েছে। অ্যাডমিন টিম দ্রুত কাজ শুরু করবে!", "Your ticket has been submitted successfully! Support team will assist shortly."),
    ("🔔 [অনুমোদন অপেক্ষমাণ] গ্রাহক ${activeClient.name} (${activeClient.userId}) - ৳${chosenPkg.price} (${selectedPaymentMethod}), TrxID: ${finalTrx} পেমেন্ট করেছেন। এডমিন প্যানেলের \"Subscriptions\" থেকে \"একসেপ্ট\" (Accept) করুন।",
     "🔔 [Pending Approval] Subscriber ${activeClient.name} (${activeClient.userId}) paid ৳${chosenPkg.price} (${selectedPaymentMethod}), TrxID: ${finalTrx}. Approve via Subscriptions page in Admin panel."),
    ("SELECT GATEWAY / মেথড", "SELECT PAYMENT GATEWAY"),
    ("Personal / Send Money (বা Merchant)", "Personal / Send Money (or Merchant)"),
    ("পেমেন্ট বা সেন্ড মানি নাম্বার:", "Payment / Send Money Number:"),
    ("আপনার", "From your"),
    ("অ্যাপ/ডায়াল থেকে", "app, transfer to"),
    ("নম্বরে", ""),
    ("নিচে লিখুন:", "below:"),
])

# Clients.tsx
clean_file("src/components/pages/Clients.tsx", [
    ("জন Subscriber", "Subscribers"),
    ("নিচের Subscriberদের Packageের মেয়াদ ৩ days বা তার কম সময়ের মধ্যে শেষ হচ্ছে। তাদের সরাসরি এসএমএস রিমাইন্ডার পাঠিয়ে বিল সংগ্রহ নিশ্চিত করুন।",
     "The following subscribers have 3 days or less before validity expires. Send an instant SMS reminder to collect bill."),
    ("জন মেয়াদোত্তীর্ণ Subscriber দেখতে ক্লিক করুন", "expired subscribers"),
    ("শুধুমাত্র ১ টি Mobile কানেকশন পাবে।", "Only 1 mobile device will connect."),
    ("Router কানেক্টেড সমস্ত ডিভাইস ইন্টারনেট পাবে।", "All devices connected to router will receive internet."),
    ("ক্লিক করে অনলাইন/অফলাইন টগল করুন (${c.status === 'online' ? 'অফলাইন করতে ক্লিক করুন' : 'অনলাইন করতে ক্লিক করুন'})",
     "Click to toggle online/offline (${c.status === 'online' ? 'Click to set offline' : 'Click to set online'})"),
])

print("Completed clean_final.py")
