export type LegalBlock =
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; text: string };

export const translations = {
  en: {
    meta: {
      title: "The Navy — Software & Mobile Solutions",
      description: "The Navy is an independent app studio building AI-powered software and mobile products, starting with Cardlogue.",
    },
    tagline: "Software & Mobile Solutions",
    nav: { about: "About", cardlogue: "Cardlogue", contact: "Contact" },
    hero: {
      badge: "Software & Mobile Solutions",
      headlinePrefix: "We",
      headlineHighlight: "Navigate",
      headlineSuffix: "Your Digital Ocean",
      subtitle: "Mobile and software solutions, crafted with sharp insight and rock-solid engineering.",
      cta: "Explore",
    },
    about: {
      eyebrow: "Our Compass",
      title: "Fluid Experience, Solid Architecture",
      taglines: ["We Code Your Scale", "Invisible Tech, Visible Value"],
      body: "We catch market shifts and trends fast and sharp, then engineer them to completion with the depth and solidity of the deep sea — the Navy way.",
    },
    services: {
      eyebrow: "What We Do",
      title: "Core Capabilities",
      items: [
        { title: "Software Development", body: "Full-stack web platforms built for speed, scale, and long-term maintainability." },
        { title: "Mobile App Development", body: "Native-feeling iOS & Android apps." },
        { title: "AI Integration", body: "Practical AI features woven into real products, not bolted on as a gimmick." },
      ],
    },
    contact: {
      title: "Ready to Sail?",
      body: "Questions, feedback, or partnership ideas — we'd love to hear from you.",
      cta: "Ready to Sail? Contact Us",
    },
    footer: {
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      rights: "All rights reserved.",
      business: "The Navy · Representative: Juhyung Lee · Business Registration No. 155-26-01968 · 166 Uchang-ro, Buk-gu, Pohang-si, Gyeongsangbuk-do, Republic of Korea (37627) · 070-7954-1968 · globalmarketradar@gmail.com",
    },
    legal: {
      home: "Home",
      cardlogue: "Cardlogue",
      lastUpdated: "Last updated",
    },
    cardlogue: {
      meta: {
        title: "Cardlogue — Business Card Management for Teams",
        description: "Scan, organize, and share business cards as a team with Cardlogue's AI-powered OCR and digital card book.",
      },
      nav: { home: "Home" },
      hero: {
        title: "Your team's business cards, finally organized",
        subtitle:
          "One scan organizes your whole team's network of contacts. Make card management part of the job with Cardlogue.",
        ctaAppStore: "Download on the App Store",
        ctaGooglePlay: "Get it on Google Play",
      },
      screenshots: {
        eyebrow: "See it in action",
        title: "A quick look inside Cardlogue",
        items: [
          { file: "scan", caption: "Scan a card and it's recognized instantly" },
          { file: "mycard", caption: "Create your own digital card and share it by QR" },
          { file: "team", caption: "See who your team has met, together" },
        ],
      },
      values: [
        {
          title: "Accurate Recognition",
          body: "Handwritten or designer business cards — nothing gets missed. AI-powered OCR recognizes names, companies, titles, and contact details quickly and accurately.",
        },
        {
          title: "Team-Wide Management",
          body: "The whole team shares who met which client, and when. Manage cards as an organizational asset, not a personal card holder.",
        },
        {
          title: "Team Card Book",
          body: "See and manage every card your team has collected, in one place. Even when the point of contact changes, the record of the touchpoint stays with the team.",
        },
      ],
      features: [
        {
          title: "Business Card Scanning (OCR)",
          body: "Take a photo and names, companies, titles, and contact details are automatically recognized and saved. Misread fields can be corrected instantly.",
        },
        {
          title: "Digital Card & QR Sharing",
          body: "Create your own digital business card and share it instantly via QR code. Never run out of paper cards — share your profile with a single link.",
        },
        {
          title: "Transparent Pricing",
          body: "2,200 KRW per person, per month. No hidden costs, no ads.",
        },
      ],
      pricing: {
        eyebrow: "Pricing",
        title: "Simple, Transparent Pricing",
        plans: [
          { name: "Free Trial", price: "Free for 7 days", audience: "All features included, for new users" },
          { name: "Individual Plan", price: "2,200 KRW / month", audience: "For individual users" },
          { name: "Team Plan", price: "Headcount × 2,200 KRW / month", audience: "For teams and organizations" },
        ],
        footnote: "With team bulk billing, the team admin pays the total amount.",
      },
      security: {
        title: "Security & Trust",
        items: [
          "No ads — we never sell or use your data for advertising",
          "We publish our Privacy Policy and Terms of Service transparently",
        ],
      },
      faq: {
        title: "Frequently Asked Questions",
        items: [
          {
            q: "Do I get billed automatically after the free trial?",
            a: "No. You will not be automatically charged after the 7-day free trial ends. Feel free to try it without any commitment.",
          },
          {
            q: "How do I cancel?",
            a: "You can unsubscribe and delete your account anytime from the app's settings menu.",
          },
          {
            q: "What happens to cards scanned by a team member who leaves?",
            a: "Cards saved to the team card book remain a team asset and are preserved independently of a member leaving the team.",
          },
          {
            q: "Is my data deleted immediately when I cancel?",
            a: "No — cancelling or a failed payment only restricts paid features; your data is not deleted. Data is only deleted when you request it yourself or delete your account.",
          },
        ],
      },
      bottomCta: {
        title: "Scan your team's first business card, right now",
        ctaAppStore: "Download on the App Store",
        ctaGooglePlay: "Get it on Google Play",
        linkPrivacy: "Privacy Policy",
        linkTerms: "Terms of Service",
        linkRefund: "Refund Policy",
        linkTeamPayment: "Team Plan Payment",
        linkContact: "Contact",
        businessInfo:
          "The Navy · Representative: Juhyung Lee · Business Registration No. 155-26-01968 · 166 Uchang-ro, Buk-gu, Pohang-si, Gyeongsangbuk-do, Republic of Korea (37627) · 070-7954-1968",
      },
    },
    privacy: {
      title: "Privacy Policy",
      intro:
        "The Navy (\"we\", \"us\", or \"our\") operates mobile and web applications, including Cardlogue (collectively, the \"Services\"), and complies with applicable data protection laws including South Korea's Personal Information Protection Act (PIPA). This Privacy Policy explains how we collect, use, retain, and destroy personal information in the course of providing the Services.",
      blocks: [
        { type: "heading", text: "1. Personal Information We Collect" },
        { type: "paragraph", text: "We collect the following personal information to provide the Services:" },
        { type: "subheading", text: "a. At sign-up and login" },
        {
          type: "list",
          items: [
            "Email, name, and profile photo provided via social login (Google, Kakao)",
            "Account identifier (unique ID)",
          ],
        },
        { type: "subheading", text: "b. Information you provide while using the Services" },
        {
          type: "list",
          items: [
            "Scanned business card images and the card information extracted from them (name, company, title, phone, email, address, etc.)",
            "Business card / contact information you enter manually",
            "Your digital business card profile information and profile photo",
            "Team name and member composition, if you use team features",
          ],
        },
        { type: "subheading", text: "c. Information collected via device permissions" },
        {
          type: "list",
          items: [
            "Camera — accessed to provide the business card scanning feature. Captured images are not stored or used beyond OCR processing.",
          ],
        },
        { type: "subheading", text: "d. Information collected automatically" },
        {
          type: "list",
          items: ["Device type, OS version, app version, access logs, usage records, and error logs"],
        },
        { type: "subheading", text: "e. At payment (once paid plans launch)" },
        {
          type: "paragraph",
          text: "We do not directly store payment information; it is processed by the payment providers listed in Section 5.",
        },
        { type: "paragraph", text: "We do not collect sensitive information (beliefs, health, sex life, etc.) beyond the items above." },

        { type: "heading", text: "2. Purposes of Collection and Use" },
        {
          type: "list",
          items: [
            "Member identification and provision/operation of the Services",
            "Processing business card scan (OCR) results and managing the card book",
            "Providing digital business card creation, QR sharing, and web page issuance features",
            "Providing team features (team card book, member management)",
            "Responding to inquiries and delivering notices",
            "Improving the Services, developing new features, and analyzing usage statistics",
            "Preventing fraudulent use, responding to violations of terms, and ensuring service stability",
            "Processing paid transactions and managing subscriptions (once payments launch)",
          ],
        },

        { type: "heading", text: "3. Retention and Use Period" },
        {
          type: "list",
          items: [
            "In principle, information is destroyed without delay upon account deletion.",
            "Where retention is required by law, we retain the information for the applicable period before destruction.",
            "Contract/payment records under the Act on Consumer Protection in E-Commerce: 5 years",
            "Consumer complaint or dispute records: 3 years",
            "Access logs under the Protection of Communications Secrets Act: 3 months",
            "Criteria for handling dormant accounts (long-term inactivity) may be applied after separate notice, as required by law.",
          ],
        },

        { type: "heading", text: "4. Destruction Procedure and Method" },
        {
          type: "list",
          items: [
            "Personal information is destroyed without delay once the retention period ends or the purpose of processing is achieved.",
            "Electronic files are permanently deleted using methods that prevent recovery; paper documents are shredded or incinerated.",
          ],
        },

        { type: "heading", text: "5. Third-Party Provision and Outsourced Processing" },
        {
          type: "paragraph",
          text: "We do not sell your personal information without consent. We outsource certain processing to the following providers:",
        },
        {
          type: "table",
          headers: ["Provider", "Outsourced Task", "Information Processed"],
          rows: [
            ["Supabase (Supabase Inc.)", "Database and file (image) storage, authentication", "Account info, business card info, images"],
            ["Naver Cloud (CLOVA OCR)", "Text recognition (OCR) on business card images", "Scanned business card images"],
            ["Anthropic, PBC (Claude API)", "Classifying OCR text into structured fields (name/company/title, etc.)", "Text extracted from business cards"],
            ["Google, Kakao", "Social login authentication", "Email, name, profile photo"],
            [
              "Render Services, Inc.",
              "Hosting the digital business card web page and providing QR sharing",
              "Digital business card profile information (name, company, title, phone, email, profile photo)",
            ],
            ["RevenueCat", "In-app subscription payment processing (once launched)", "Subscription status, payment identifiers"],
            [
              "PortOne Corp. / NHN KCP",
              "Payment processing (credit card recurring billing authorization, settlement, cancellation)",
              "Name, contact information (email/phone), payment (card) details",
            ],
            ["Paddle", "International web payment processing (once launched)", "Payment information"],
          ],
        },
        {
          type: "paragraph",
          text: "The outsourcing period for PortOne runs until termination of the service agreement or the processing contract.",
        },
        {
          type: "paragraph",
          text: "When entering into outsourcing agreements, we contractually require compliance with data protection laws, restrictions on re-outsourcing, security measures, and management/supervision of the processor, and we check compliance.",
        },

        { type: "heading", text: "6. Overseas Transfer of Personal Information" },
        {
          type: "paragraph",
          text: "We transfer personal information overseas as described below, and obtain separate consent for the overseas transfer the first time you use the relevant feature.",
        },
        {
          type: "table",
          headers: ["Recipient", "Country", "Items Transferred", "Purpose", "Retention Period"],
          rows: [
            [
              "Anthropic, PBC",
              "United States",
              "Text extracted from business cards",
              "Classifying OCR result data into fields (name/company/title, etc.)",
              "Not retained after processing (only the resulting output is stored on our servers)",
            ],
            [
              "Render Services, Inc.",
              "United States",
              "Digital business card profile information — name, company, title, phone, email, profile photo",
              "Hosting the digital business card web page and providing QR sharing",
              "Until the digital card is deleted or the account is closed",
            ],
          ],
        },
        {
          type: "paragraph",
          text: "Our database and storage (Supabase) run in the Seoul (South Korea) region and do not constitute an overseas transfer.",
        },
        {
          type: "paragraph",
          text: "You may refuse to consent to the overseas transfer; doing so limits the corresponding feature:",
        },
        {
          type: "list",
          items: [
            "Refusing the Anthropic-related consent limits automatic card-scanning (OCR); you can still register cards manually.",
            "Refusing the Render-related consent limits creating and QR-sharing your digital business card.",
          ],
        },
        {
          type: "paragraph",
          text: "Other features of the Services are unaffected regardless of your consent choice.",
        },
        {
          type: "callout",
          text: "⚠️ If Paddle (international payments) is introduced, the corresponding overseas-transfer details (recipient, country, items, purpose, retention period) will be added to this table with advance notice.",
        },

        { type: "heading", text: "7. Your Rights and How to Exercise Them" },
        { type: "paragraph", text: "You may exercise the following rights at any time via the contact information below:" },
        {
          type: "list",
          items: [
            "Request access to, correction of, or deletion of your personal information",
            "Request suspension of processing",
            "Withdraw consent and delete your account",
          ],
        },
        {
          type: "paragraph",
          text: "Requests are handled within the period required by applicable law after we receive your email. For users under 14, a legal guardian may exercise these rights on their behalf.",
        },

        { type: "heading", text: "8. Security Measures" },
        {
          type: "list",
          items: [
            "Encryption of stored data and encrypted transmission (HTTPS)",
            "Access permission management and access control (Row Level Security)",
            "Minimizing and training personnel who handle personal information",
            "Installing and updating security software against hacking and similar threats",
          ],
        },

        { type: "heading", text: "9. Cookies and Other Automatic Collection Tools" },
        {
          type: "paragraph",
          text: "Our websites and digital business card web pages may use cookies for service convenience. You may refuse cookies via your browser settings, which may limit some functionality.",
        },

        { type: "heading", text: "10. Children's Privacy" },
        {
          type: "paragraph",
          text: "We do not knowingly collect personal information from children under 14. If we identify a user under 14, we obtain guardian consent or delete the relevant information.",
        },

        { type: "heading", text: "11. Personal Information Protection Officer" },
        {
          type: "table",
          headers: ["Item", "Details"],
          rows: [
            ["Protection Officer", "Juhyung Lee (Representative)"],
            ["Contact", "globalmarketradar@gmail.com"],
            ["Access request handling department", "Same as above"],
          ],
        },
        {
          type: "paragraph",
          text: "You may contact us at the above address with inquiries, complaints, or requests for remedy regarding personal information. You may also contact the following agencies (Korea) for reporting or consultation on privacy infringement:",
        },
        {
          type: "list",
          items: [
            "Personal Information Dispute Mediation Committee (privacy.kr / 1833-6972)",
            "Privacy Infringement Report Center (privacy.kr / 118)",
          ],
        },

        { type: "heading", text: "12. Notice of Policy Changes" },
        {
          type: "paragraph",
          text: "This Policy may be revised in response to changes in law, policy, or the Services. Changes are announced at least 7 days in advance (30 days for material changes) via an in-service notice or this page.",
        },

        { type: "heading", text: "13. Service Availability" },
        {
          type: "paragraph",
          text: "We currently offer the Services in South Korea and select other countries (including the United States).",
        },
        {
          type: "callout",
          text: "We do not offer the Services to residents of the European Union, the United Kingdom, or Switzerland. Downloads are restricted on the App Store and Google Play in these regions.",
        },
        {
          type: "paragraph",
          text: "Accordingly, the EU General Data Protection Regulation (GDPR), the UK GDPR, and Switzerland's Federal Act on Data Protection (FADP) are not intended to apply to our Services.",
        },
      ] as LegalBlock[],
      closingNote: "This Policy takes effect on July 8, 2026.",
    },
    terms: {
      title: "Terms of Service",
      blocks: [
        { type: "heading", text: "Article 1 (Purpose)" },
        {
          type: "paragraph",
          text: "These Terms govern the conditions and procedures for using the applications and websites operated by The Navy (\"we\", \"us\", or \"our\"), including Cardlogue (collectively, the \"Services\"), as well as the rights, obligations, and responsibilities of us and our users.",
        },

        { type: "heading", text: "Article 2 (Effect and Amendment of Terms)" },
        {
          type: "list",
          items: [
            "These Terms take effect when posted on the Services or otherwise notified to users.",
            "We may amend these Terms within the scope permitted by applicable law. When amended, we will state the effective date and reason and announce the change at least 7 days before it takes effect (30 days for changes disadvantageous to users).",
            "If you continue using the Services after amended Terms take effect, you are deemed to have agreed to them; if you do not agree, you may terminate your account.",
          ],
        },

        { type: "heading", text: "Article 3 (Description of the Services)" },
        { type: "paragraph", text: "We provide the following Services:" },
        {
          type: "list",
          items: [
            "Business card scanning and OCR-based information extraction and storage (card book)",
            "Digital business card creation and QR code sharing",
            "Team-based business card sharing (team card book)",
            "Other supplementary services as we determine",
          ],
        },
        { type: "paragraph", text: "Detailed service specifications follow the descriptions provided in the app and website." },

        { type: "heading", text: "Article 4 (Formation of the Service Agreement; Minors)" },
        {
          type: "list",
          items: [
            "The service agreement is formed when a user applies for membership following our procedures and we accept the application.",
            "Children under 14 may not register for the Services. Minors 14 or older using paid Services require the consent of a legal guardian; a contract formed without such consent may be voided by the minor or the guardian.",
          ],
        },

        { type: "heading", text: "Article 5 (Paid Services and Payment)" },
        { type: "subheading", text: "Free trial" },
        { type: "paragraph", text: "New users may use all features free of charge for 7 days from the date of signup." },
        { type: "subheading", text: "Conversion to paid plan" },
        {
          type: "paragraph",
          text: "When the free trial ends, access to paid features is restricted and no automatic charge occurs. A recurring monthly charge (2,200 KRW per person) is only billed if you actively choose and check out on a paid plan.",
        },
        { type: "subheading", text: "Team billing" },
        {
          type: "paragraph",
          text: "Team plans are billed in bulk by the team admin, based on headcount (headcount × 2,200 KRW). The team admin is the party to the payment contract and is responsible for the billed amount and changes in team headcount.",
        },
        { type: "subheading", text: "Automatic renewal and cancellation" },
        {
          type: "paragraph",
          text: "Subscriptions renew automatically each billing cycle unless cancelled. You may cancel at any time via your App Store/Google Play account settings or in-app menu; cancellation stops billing from the next cycle.",
        },
        { type: "subheading", text: "Refunds" },
        {
          type: "list",
          items: [
            "In-app purchases (App Store, Google Play) follow the respective platform's refund policy and procedure.",
            "Web payments (e.g., team bulk billing) are handled under applicable consumer protection law for e-commerce; for paid periods already used, refunds are prorated based on the period used.",
          ],
        },
        {
          type: "paragraph",
          text: "Changes in payment or subscription status (cancellation, failed payment, etc.) do not result in arbitrary deletion of your data — only paid features are restricted. Data is deleted only at your request or upon team deletion.",
        },

        { type: "heading", text: "Article 6 (User Content)" },
        {
          type: "list",
          items: [
            "You retain ownership of content you submit to the Services (scanned business cards, contact information, profiles, etc.).",
            "You grant us a non-exclusive, royalty-free, limited license to store, process, and reproduce that content to the extent necessary to provide the Services (storage, OCR processing, team sharing, etc.). This license ends immediately when you delete the content or your account.",
            "If you upload content containing another person's personal information (e.g., their business card), you are responsible for complying with applicable law, and we are not liable for resulting disputes with third parties.",
          ],
        },

        { type: "heading", text: "Article 7 (User Obligations and Restrictions)" },
        { type: "paragraph", text: "You agree not to:" },
        {
          type: "list",
          items: [
            "Use the Services in violation of applicable law or for an unauthorized purpose",
            "Reverse engineer the Services or attempt to extract source code",
            "Disrupt the operation of the Services or attempt abnormal access",
            "Upload content that infringes another person's personal information, copyright, or other rights",
            "Use the Services to distribute spam, malware, or unlawful information",
          ],
        },

        { type: "heading", text: "Article 8 (Management of Postings)" },
        {
          type: "list",
          items: [
            "If we determine that content you uploaded infringes another's rights or violates applicable law or these Terms, we may restrict access to or delete it without prior notice.",
            "A third party claiming infringement may notify us and request action; we handle such requests under the procedures required by applicable law (e.g., the Act on Promotion of Information and Communications Network Utilization).",
          ],
        },

        { type: "heading", text: "Article 9 (Intellectual Property)" },
        {
          type: "list",
          items: [
            "Intellectual property rights in software, designs, logos, trademarks, and other works we create for the Services belong to us.",
            "You may not reproduce, distribute, transmit, publish, or create derivative works from all or part of the Services without our prior written consent.",
          ],
        },

        { type: "heading", text: "Article 10 (Changes to and Suspension of the Services)" },
        {
          type: "list",
          items: [
            "We may change, add to, or discontinue all or part of the Services for operational or technical reasons.",
            "If a paid Service is discontinued while you are using it, we will notify you in advance and take necessary action (such as a refund) as required by law.",
            "The Services may be temporarily suspended due to unavoidable causes such as force majeure, system failure, or scheduled maintenance; we will provide notice before or after such suspension.",
          ],
        },

        { type: "heading", text: "Article 11 (Disclaimer of Warranties)" },
        {
          type: "paragraph",
          text: "The Services are provided \"as is\" and \"as available.\" We do not warrant that the Services will be uninterrupted, error-free, or completely secure, and we disclaim express and implied warranties to the extent permitted by law. This does not exempt us from liability arising from our intent or gross negligence.",
        },

        { type: "heading", text: "Article 12 (Limitation of Liability)" },
        {
          type: "list",
          items: [
            "We are not liable for service disruptions caused by force majeure, events beyond our control, or a user's own fault.",
            "To the extent permitted by law, we are not liable for indirect, incidental, special, or consequential damages arising from use of the Services, except for damages caused by our intent or gross negligence.",
            "We are not liable for damages arising from information or materials you obtained through the Services, absent our intent or negligence.",
          ],
        },

        { type: "heading", text: "Article 13 (Termination and Restriction of Use)" },
        {
          type: "list",
          items: [
            "You may terminate the service agreement (delete your account) at any time via the settings menu in the Services.",
            "If you violate these Terms, we may restrict your use of the Services or terminate the agreement after prior notice (or after the fact in urgent cases).",
          ],
        },

        { type: "heading", text: "Article 14 (Dispute Resolution)" },
        {
          type: "list",
          items: [
            "We strive to promptly address complaints and feedback submitted by users.",
            "If a dispute arises between us and a user, we will endeavor to resolve it through mutual consultation; absent agreement, applicable law and commercial practice will govern.",
          ],
        },

        { type: "heading", text: "Article 15 (Governing Law and Jurisdiction)" },
        {
          type: "list",
          items: [
            "Disputes between us and users regarding these Terms or use of the Services are governed by the laws of the Republic of Korea.",
            "Litigation over such disputes is brought before the court with jurisdiction under the Civil Procedure Act.",
          ],
        },

        { type: "heading", text: "Article 16 (Contact)" },
        { type: "paragraph", text: "If you have any questions about these Terms, please contact us at globalmarketradar@gmail.com." },
      ] as LegalBlock[],
      closingNote: "These Terms take effect on July 2, 2026.",
    },
    refund: {
      title: "Refund Policy",
      blocks: [
        { type: "heading", text: "1. Purpose" },
        {
          type: "paragraph",
          text: "This Refund Policy explains the refund criteria and procedure for paid subscriptions to Cardlogue, the business card management application operated by The Navy (\"we\", \"us\", or \"our\"). This Policy forms part of, and applies together with, our Terms of Service.",
        },

        { type: "heading", text: "2. Free Trial" },
        {
          type: "paragraph",
          text: "We provide all new users (guest or registered) with a 7-day free trial with full feature access. No charge is billed automatically during the trial; a paid subscription only begins once you actively tap the subscribe button. Accordingly, the trial period itself is never subject to a refund.",
        },

        { type: "heading", text: "3. Refund Criteria by Payment Method" },
        { type: "paragraph", text: "Refund policy differs depending on how a Cardlogue subscription is paid for:" },
        {
          type: "table",
          headers: ["Category", "Payment Method", "Refund Basis"],
          rows: [
            ["Individual subscription", "In-app purchase (App Store / Google Play)", "Follows the respective store's refund policy"],
            ["Team subscription", "Web checkout (PortOne/Toss Payments or Paddle)", "Follows Section 4 of this Policy"],
          ],
        },
        { type: "subheading", text: "3-1. Individual subscriptions (in-app purchase)" },
        {
          type: "paragraph",
          text: "Individual subscriptions are billed through the app marketplace you use, and refund requests and processing follow that marketplace's own policy and procedure.",
        },
        {
          type: "list",
          items: [
            "Android (Google Play): request a refund from your order history in your Google Play account",
            "iOS (App Store): follow Apple's Media Services Terms and refund request procedure",
          ],
        },
        {
          type: "paragraph",
          text: "We are not involved in the marketplace operator's refund decision, and refund approval is determined solely by that marketplace's policy.",
        },
        { type: "subheading", text: "3-2. Team subscriptions (web checkout)" },
        {
          type: "paragraph",
          text: "Team subscriptions are billed directly by the team admin through our web checkout page, in proportion to the number of team members. In this case, service access is deemed to have begun, and the right of withdrawal may be limited under Article 17, Paragraph 2 of Korea's Act on Consumer Protection in Electronic Commerce.",
        },
        {
          type: "callout",
          text: "Before completing a team subscription payment, users are notified that \"you agree that service use begins immediately and the right of withdrawal is limited,\" and payment proceeds only after this is acknowledged.",
        },

        { type: "heading", text: "4. Team Subscription Refund Details" },
        {
          type: "list",
          items: [
            "Flat-rate billing: Team subscription fees are charged as a flat amount — team headcount as of the 1st of each month × 2,200 KRW — and are not prorated for headcount changes during that month.",
            "Refunds for billing errors: If a duplicate charge occurred due to our system error, or the Services were not properly provided, we will refund the applicable amount after review.",
            "Refunds for non-use: A refund solely on the grounds of not using the Services after payment is, in principle, restricted. However, if it is confirmed that the Services were not used at all on the day of payment, you may contact us for individual review.",
            "Cancellation timing: Team subscription cancellation takes effect from the following month; fees already paid for the current month are not refunded.",
          ],
        },

        { type: "heading", text: "5. Account and Data Handling" },
        {
          type: "paragraph",
          text: "We do not delete your data when a subscription expires or a payment fails. Only paid features (adding new cards, creating or joining a team, etc.) are restricted; viewing, editing, and deleting your existing cards and digital cards remains available.",
        },

        { type: "heading", text: "6. Refund Request Procedure" },
        { type: "paragraph", text: "If you would like a refund, please follow the procedure below:" },
        {
          type: "list",
          items: [
            "In-app purchase users: request directly through Google Play / App Store customer support",
            "Web checkout (team subscription) users: contact us using the information below",
          ],
        },
        { type: "paragraph", text: "We provide the outcome of a refund request within 7 business days of receiving it." },

        { type: "heading", text: "7. Changes to This Policy" },
        {
          type: "paragraph",
          text: "This Refund Policy may be revised in response to changes in law or the Services' operational needs. Changes are announced in advance via an in-service notice or this page.",
        },

        { type: "heading", text: "Business Information" },
        {
          type: "table",
          headers: ["Item", "Details"],
          rows: [
            ["Company", "The Navy"],
            ["Representative", "Juhyung Lee"],
            ["Business Registration No.", "155-26-01968"],
            ["Address", "166 Uchang-ro, Buk-gu, Pohang-si, Gyeongsangbuk-do, Republic of Korea (37627)"],
            ["Phone", "070-7954-1968"],
            ["Email", "globalmarketradar@gmail.com"],
          ],
        },
      ] as LegalBlock[],
      closingNote: "This Policy takes effect on July 12, 2026.",
    },
  },
  ko: {
    meta: {
      title: "더네이비 — 소프트웨어 & 모바일 솔루션",
      description: "더네이비는 AI 기반 소프트웨어와 모바일 제품을 만드는 1인 앱 스튜디오입니다. 첫 제품은 카드로그예요.",
    },
    tagline: "소프트웨어 & 모바일 솔루션",
    nav: { about: "소개", cardlogue: "Cardlogue", contact: "문의" },
    hero: {
      badge: "소프트웨어 & 모바일 솔루션",
      headlinePrefix: "우리는 당신의",
      headlineHighlight: "디지털 바다",
      headlineSuffix: "를 항해합니다",
      subtitle: "예리한 시선과 단단한 기술력으로 완성하는 모바일·소프트웨어 솔루션",
      cta: "둘러보기",
    },
    about: {
      eyebrow: "우리의 나침반",
      title: "경험은 매끄럽게, 솔루션은 단단하게",
      taglines: ["당신의 확장, 코드로 완성합니다", "보이지 않는 기술로, 보이는 가치를"],
      body: "시장의 변화와 트렌드는 예리하고 빠르게 포착하고, 기술의 완성도와 비즈니스 신뢰는 심해(Navy)처럼 깊고 단단하게 완성합니다.",
    },
    services: {
      eyebrow: "우리가 하는 일",
      title: "핵심 역량",
      items: [
        { title: "소프트웨어 개발", body: "속도와 확장성, 장기적인 유지보수까지 고려한 풀스택 웹 플랫폼." },
        { title: "모바일 앱 개발", body: "네이티브 감성의 iOS & Android 앱." },
        { title: "AI 통합", body: "겉치레가 아닌, 제품 안에 실질적으로 녹아든 AI 기능." },
      ],
    },
    contact: {
      title: "함께 항해할 준비 되셨나요?",
      body: "질문, 피드백, 협업 제안 무엇이든 환영합니다.",
      cta: "함께 항해하기",
    },
    footer: {
      privacy: "개인정보처리방침",
      terms: "이용약관",
      rights: "All rights reserved.",
      business: "더네이비(The Navy) · 대표: 이주형 · 사업자등록번호: 155-26-01968 · 경북 포항시 북구 우창로 166 (37627) · 070-7954-1968 · globalmarketradar@gmail.com",
    },
    legal: {
      home: "홈",
      cardlogue: "카드로그",
      lastUpdated: "최종 수정일",
    },
    cardlogue: {
      meta: {
        title: "카드로그 — 팀을 위한 명함 관리",
        description: "AI 기반 OCR과 팀명함첩으로 명함을 스캔하고 정리하고 공유하세요.",
      },
      nav: { home: "홈" },
      hero: {
        title: "팀의 명함, 이제 흩어지지 않습니다",
        subtitle: "스캔 한 번으로 정리되는 팀 전체의 인맥 자산. 카드로그로 명함 관리를 팀 업무의 일부로 만드세요.",
        ctaAppStore: "App Store에서 다운로드",
        ctaGooglePlay: "Google Play에서 다운로드",
      },
      screenshots: {
        eyebrow: "실제 화면",
        title: "카드로그, 이렇게 생겼어요",
        items: [
          { file: "scan", caption: "명함을 스캔하면 즉시 인식돼요" },
          { file: "mycard", caption: "나만의 디지털 명함을 만들고 QR로 공유" },
          { file: "team", caption: "누가 어떤 고객을 만났는지 함께 확인" },
        ],
      },
      values: [
        {
          title: "정확한 인식",
          body: "손글씨든 디자인 명함이든, 놓치지 않는 정보 추출. AI 기반 OCR로 이름·회사·직함·연락처를 빠르고 정확하게 인식합니다.",
        },
        {
          title: "팀 단위 관리",
          body: "누가 어떤 고객을 만났는지, 팀 전체가 공유합니다. 개인 명함첩이 아니라 조직의 자산으로 관리하세요.",
        },
        {
          title: "팀명함첩",
          body: "팀원이 수집한 명함을 한곳에서 확인하고 관리합니다. 담당자가 바뀌어도 고객 접점 기록은 팀에 남습니다.",
        },
      ],
      features: [
        {
          title: "명함 스캔 (OCR)",
          body: "카메라로 촬영하면 자동으로 이름, 회사, 직함, 연락처가 인식되어 저장됩니다. 잘못 인식된 정보는 바로 수정할 수 있습니다.",
        },
        {
          title: "디지털 명함 & QR 공유",
          body: "나만의 디지털 명함을 만들고 QR코드로 즉시 공유하세요. 명함이 떨어질 걱정 없이, 링크 하나로 프로필을 전달합니다.",
        },
        {
          title: "투명한 요금",
          body: "인당 월 2,200원, 숨겨진 비용이나 광고 없습니다.",
        },
      ],
      pricing: {
        eyebrow: "가격",
        title: "간단하고 투명한 가격",
        plans: [
          { name: "무료 체험", price: "7일 무료", audience: "모든 기능 이용 가능, 신규 이용자" },
          { name: "개인 플랜", price: "월 2,200원", audience: "개인 이용자" },
          { name: "팀 플랜", price: "인원수 × 2,200원/월", audience: "팀/조직" },
        ],
        footnote: "팀 일괄결제 선택 시 팀 관리자가 전체 금액을 결제합니다.",
      },
      security: {
        title: "보안 및 신뢰",
        items: [
          "광고 없는 서비스 — 이용자 데이터를 판매하거나 광고에 활용하지 않습니다",
          "개인정보처리방침과 이용약관을 투명하게 공개합니다",
        ],
      },
      faq: {
        title: "자주 묻는 질문",
        items: [
          {
            q: "무료체험 후 자동으로 결제되나요?",
            a: "아니요. 7일 무료체험 종료 후 자동결제 되지 않습니다. 부담없이 무료체험 하세요.",
          },
          {
            q: "해지는 어떻게 하나요?",
            a: "앱 내 설정 메뉴에서 구독해제 및 계정탈퇴 가능합니다.",
          },
          {
            q: "팀원이 나가면 그 팀원이 등록한 명함은 어떻게 되나요?",
            a: "팀명함첩에 등록된 명함은 팀 자산으로 유지되며, 팀원 탈퇴와 별개로 보존됩니다.",
          },
          {
            q: "해지하면 데이터가 바로 삭제되나요?",
            a: "아니요, 결제 해지나 실패는 유료 기능 이용만 제한할 뿐 데이터를 삭제하지 않습니다. 데이터 삭제는 이용자가 직접 요청하거나 계정을 탈퇴할 때만 이루어집니다.",
          },
        ],
      },
      bottomCta: {
        title: "팀의 첫 명함, 지금 스캔해보세요",
        ctaAppStore: "App Store에서 다운로드",
        ctaGooglePlay: "Google Play에서 다운로드",
        linkPrivacy: "개인정보처리방침",
        linkTerms: "이용약관",
        linkRefund: "환불정책",
        linkTeamPayment: "팀 플랜 결제",
        linkContact: "문의하기",
        businessInfo:
          "더네이비(The Navy) · 대표: 이주형 · 사업자등록번호: 155-26-01968 · 경북 포항시 북구 우창로 166 (37627) · 070-7954-1968",
      },
    },
    privacy: {
      title: "개인정보처리방침",
      intro:
        "더네이비(The Navy, 이하 \"당사\")는 카드로그(Cardlogue)를 포함한 모바일 및 웹 애플리케이션(이하 \"서비스\")을 운영하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본 개인정보처리방침은 당사가 서비스 이용 과정에서 개인정보를 어떻게 수집·이용·보관·파기하는지 설명합니다.",
      blocks: [
        { type: "heading", text: "1. 수집하는 개인정보 항목" },
        { type: "paragraph", text: "당사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다." },
        { type: "subheading", text: "가. 회원가입 및 로그인 시" },
        {
          type: "list",
          items: [
            "소셜 로그인(Google, Kakao) 시 제공되는 이메일, 이름, 프로필 사진",
            "계정 식별자(고유 ID)",
          ],
        },
        { type: "subheading", text: "나. 서비스 이용 과정에서 이용자가 직접 제공하는 정보" },
        {
          type: "list",
          items: [
            "명함 스캔 이미지 및 이를 통해 추출된 명함 정보(이름, 회사명, 직함, 전화번호, 이메일, 주소 등)",
            "이용자가 직접 입력한 명함/연락처 정보",
            "이용자가 생성한 디지털 명함 프로필 정보 및 프로필 사진",
            "팀 기능 이용 시 팀명, 팀원 구성 정보",
          ],
        },
        { type: "subheading", text: "다. 기기 권한을 통해 수집하는 정보" },
        {
          type: "list",
          items: ["카메라 — 명함 스캔 기능 제공을 위해 접근하며, 촬영된 이미지는 OCR 처리 목적 외에는 저장·이용하지 않습니다."],
        },
        { type: "subheading", text: "라. 자동으로 수집되는 정보" },
        {
          type: "list",
          items: ["기기 종류, OS 버전, 앱 버전, 접속 로그, 서비스 이용 기록, 오류 로그"],
        },
        { type: "subheading", text: "마. 결제 시 (유료 전환 시점부터 적용)" },
        {
          type: "paragraph",
          text: "결제 처리에 필요한 정보는 당사가 직접 저장하지 않으며, 아래 5항의 결제대행업체가 처리합니다.",
        },
        { type: "paragraph", text: "당사는 위 항목 외의 민감정보(사상·신념, 건강, 성생활 등)를 수집하지 않습니다." },

        { type: "heading", text: "2. 개인정보의 수집 및 이용 목적" },
        {
          type: "list",
          items: [
            "회원 식별 및 서비스 제공·운영",
            "명함 스캔(OCR) 결과 처리 및 명함첩 관리 기능 제공",
            "디지털 명함 생성, QR 공유, 웹페이지 발급 등 부가 기능 제공",
            "팀 기능(팀명함첩, 팀원 관리) 제공",
            "고객 문의 응대 및 공지사항 전달",
            "서비스 개선, 신규 기능 개발, 이용 통계 분석",
            "부정 이용 방지, 약관 위반 대응, 서비스 안정성 확보",
            "유료 결제 처리 및 구독 관리(결제 기능 도입 시)",
          ],
        },

        { type: "heading", text: "3. 개인정보의 보유 및 이용 기간" },
        {
          type: "list",
          items: [
            "원칙적으로 회원 탈퇴 시 지체 없이 파기합니다.",
            "단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관 후 파기합니다.",
            "전자상거래법에 따른 계약/결제 기록: 5년",
            "소비자 불만 또는 분쟁처리 기록: 3년",
            "통신비밀보호법에 따른 로그 기록: 3개월",
            "휴면 계정(장기 미이용)의 처리 기준은 관련 법령에 따라 별도 고지 후 적용할 수 있습니다.",
          ],
        },

        { type: "heading", text: "4. 개인정보의 파기 절차 및 방법" },
        {
          type: "list",
          items: [
            "보유 기간 경과, 처리 목적 달성 등 개인정보가 불필요하게 된 경우 지체 없이 파기합니다.",
            "전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제하며, 종이 문서는 분쇄 또는 소각합니다.",
          ],
        },

        { type: "heading", text: "5. 개인정보의 제3자 제공 및 처리위탁" },
        {
          type: "paragraph",
          text: "당사는 이용자의 동의 없이 개인정보를 외부에 판매하지 않습니다. 다만 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있으며, 위탁받는 자와 위탁 업무 내용은 다음과 같습니다.",
        },
        {
          type: "table",
          headers: ["수탁업체", "위탁 업무", "처리 정보"],
          rows: [
            ["Supabase (Supabase Inc.)", "데이터베이스 및 파일(이미지) 저장, 인증 처리", "계정정보, 명함정보, 이미지"],
            ["네이버클라우드(CLOVA OCR)", "명함 이미지 텍스트 인식(OCR)", "명함 스캔 이미지"],
            ["Anthropic, PBC (Claude API)", "OCR 결과 텍스트의 항목 분류(이름/회사/직함 등 구조화)", "명함에서 추출된 텍스트 정보"],
            ["Google, Kakao", "소셜 로그인 인증", "이메일, 이름, 프로필 사진"],
            [
              "Render Services, Inc.",
              "디지털 명함(내 명함) 웹페이지 호스팅 및 QR 공유 서비스 제공",
              "디지털 명함 프로필 정보(이름, 회사명, 직함, 전화번호, 이메일, 프로필사진)",
            ],
            ["RevenueCat", "인앱 구독 결제 처리 (결제 기능 도입 시)", "구독 상태, 결제 식별 정보"],
            [
              "(주)포트원 (PortOne) / NHN한국사이버결제(KCP)",
              "결제 처리 대행 (신용카드 정기결제 승인·매출·취소 처리)",
              "성명, 연락처(이메일/전화번호), 결제(카드) 정보",
            ],
            ["Paddle", "해외 웹 결제 처리 (결제 기능 도입 시)", "결제 정보"],
          ],
        },
        {
          type: "paragraph",
          text: "포트원에 대한 위탁 기간은 서비스 이용 계약 종료 시 또는 위탁 계약 종료 시까지입니다.",
        },
        {
          type: "paragraph",
          text: "당사는 위탁계약 체결 시 개인정보 보호 관련 법령 준수, 재위탁 제한, 안전성 확보조치, 수탁자에 대한 관리·감독 등을 계약서에 명시하고 이행 여부를 점검합니다.",
        },

        { type: "heading", text: "6. 개인정보의 국외이전에 관한 사항" },
        {
          type: "paragraph",
          text: "당사는 서비스 제공 과정에서 아래와 같이 개인정보를 국외로 이전하며, 관련 기능을 최초 이용하는 시점에 이용자로부터 국외이전에 관한 별도의 동의를 받습니다.",
        },
        {
          type: "table",
          headers: ["이전받는 자", "이전되는 국가", "이전 항목", "이전 목적", "보유·이용 기간"],
          rows: [
            [
              "Anthropic, PBC",
              "미국",
              "명함에서 추출된 텍스트 정보",
              "OCR 결과 데이터의 항목 분류(이름/회사/직함 등 구분)",
              "처리 완료 즉시 미보관 (결과만 당사 서버에 저장)",
            ],
            [
              "Render Services, Inc.",
              "미국",
              "디지털 명함(내 명함) 프로필 정보 — 이름, 회사명, 직함, 전화번호, 이메일, 프로필사진",
              "디지털 명함 웹페이지 호스팅 및 QR 공유 서비스 제공",
              "디지털 명함 삭제 또는 회원 탈퇴 시까지",
            ],
          ],
        },
        {
          type: "paragraph",
          text: "당사의 데이터베이스 및 스토리지(Supabase)는 국내(서울) 리전에서 운영되어 국외이전에 해당하지 않습니다.",
        },
        {
          type: "paragraph",
          text: "이용자는 국외이전 동의를 거부할 수 있으며, 거부 시 해당 기능 이용이 제한됩니다:",
        },
        {
          type: "list",
          items: [
            "Anthropic 관련 동의 거부 시: 명함 자동 스캔(OCR) 기능 이용이 제한되고 수동 입력 방식으로 명함을 등록할 수 있습니다.",
            "Render 관련 동의 거부 시: 디지털 명함(내 명함) 생성 및 QR 공유 기능 이용이 제한됩니다.",
          ],
        },
        {
          type: "paragraph",
          text: "동의 여부와 관계없이 서비스의 다른 기능 이용에는 영향이 없습니다.",
        },
        {
          type: "callout",
          text: "⚠️ 향후 Paddle(해외 결제) 도입 시 해당 업체로의 국외이전 사항(이전받는 자, 국가, 항목, 목적, 보유기간)을 이 표에 추가하고, 변경사항을 사전 고지해야 합니다.",
        },

        { type: "heading", text: "7. 정보주체(이용자)의 권리와 행사 방법" },
        { type: "paragraph", text: "이용자는 언제든지 아래 연락처를 통해 다음의 권리를 행사할 수 있습니다." },
        {
          type: "list",
          items: ["개인정보 열람, 정정, 삭제 요청", "개인정보 처리 정지 요청", "동의 철회 및 회원 탈퇴"],
        },
        {
          type: "paragraph",
          text: "요청은 이메일 접수 후 관계 법령이 정한 기간 내 조치합니다. 만 14세 미만 아동의 경우 법정대리인이 권리를 대신 행사할 수 있습니다.",
        },

        { type: "heading", text: "8. 개인정보의 안전성 확보 조치" },
        {
          type: "list",
          items: [
            "개인정보의 암호화 저장 및 전송 구간 암호화(HTTPS)",
            "접근권한 관리 및 접근통제(Row Level Security 적용)",
            "개인정보 처리 담당자 최소화 및 교육",
            "해킹 등에 대비한 보안 프로그램 설치 및 갱신",
          ],
        },

        { type: "heading", text: "9. 쿠키 등 자동 수집 장치에 관한 사항" },
        {
          type: "paragraph",
          text: "당사가 운영하는 웹사이트 및 디지털 명함 웹페이지는 서비스 이용 편의를 위해 쿠키를 사용할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.",
        },

        { type: "heading", text: "10. 아동의 개인정보 보호" },
        {
          type: "paragraph",
          text: "당사는 만 14세 미만 아동의 개인정보를 원칙적으로 수집하지 않으며, 만 14세 미만 아동으로 확인되는 경우 법정대리인의 동의를 받거나 관련 정보를 삭제합니다.",
        },

        { type: "heading", text: "11. 개인정보 보호책임자 및 열람청구 접수 부서" },
        {
          type: "table",
          headers: ["구분", "내용"],
          rows: [
            ["개인정보 보호책임자", "이주형 (대표)"],
            ["연락처", "globalmarketradar@gmail.com"],
            ["열람청구 접수·처리 부서", "상동"],
          ],
        },
        {
          type: "paragraph",
          text: "이용자는 개인정보 관련 문의, 불만 처리, 피해 구제 등에 관한 사항을 위 연락처로 문의할 수 있습니다. 그 밖에 개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의할 수 있습니다.",
        },
        {
          type: "list",
          items: ["개인정보분쟁조정위원회 (privacy.kr / 국번없이 1833-6972)", "개인정보침해신고센터 (privacy.kr / 국번없이 118)"],
        },

        { type: "heading", text: "12. 정책 변경에 관한 고지" },
        {
          type: "paragraph",
          text: "본 방침은 법령, 정책 또는 서비스 변경에 따라 개정될 수 있으며, 변경 시 최소 7일 전(중요한 변경의 경우 30일 전) 서비스 내 공지사항 또는 본 페이지를 통해 고지합니다.",
        },

        { type: "heading", text: "13. 서비스 제공 지역" },
        {
          type: "paragraph",
          text: "당사는 현재 대한민국 및 일부 국가(미국 등)를 대상으로 서비스를 제공합니다.",
        },
        {
          type: "callout",
          text: "유럽연합(EU) 회원국, 영국, 스위스 거주자를 대상으로는 서비스를 제공하지 않습니다. 해당 지역에서는 앱스토어 및 구글플레이에서 서비스 다운로드가 제한됩니다.",
        },
        {
          type: "paragraph",
          text: "이에 따라 GDPR(EU 일반개인정보보호법), UK-GDPR, FADP(스위스 연방데이터보호법)는 당사 서비스에 적용되지 않는 것을 원칙으로 합니다.",
        },
      ] as LegalBlock[],
      closingNote: "본 방침은 2026년 7월 8일부터 시행합니다.",
    },
    terms: {
      title: "이용약관",
      blocks: [
        { type: "heading", text: "제1조 (목적)" },
        {
          type: "paragraph",
          text: "본 약관은 더네이비(The Navy, 이하 \"당사\")가 제공하는 카드로그(Cardlogue) 등 애플리케이션 및 웹사이트(이하 \"서비스\")의 이용조건 및 절차, 당사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.",
        },

        { type: "heading", text: "제2조 (약관의 효력 및 변경)" },
        {
          type: "list",
          items: [
            "본 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.",
            "당사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 명시하여 적용일 최소 7일 전(이용자에게 불리한 변경의 경우 30일 전)부터 공지합니다.",
            "이용자가 개정약관 적용일 이후에도 서비스를 계속 이용하는 경우 개정약관에 동의한 것으로 간주하며, 동의하지 않는 이용자는 이용계약을 해지할 수 있습니다.",
          ],
        },

        { type: "heading", text: "제3조 (서비스의 내용)" },
        { type: "paragraph", text: "당사는 다음과 같은 서비스를 제공합니다." },
        {
          type: "list",
          items: [
            "명함 스캔 및 OCR 기반 정보 추출·저장(명함첩)",
            "디지털 명함 생성 및 QR코드 공유",
            "팀 단위 명함 공유(팀명함첩)",
            "기타 당사가 정하는 부가 서비스",
          ],
        },
        { type: "paragraph", text: "서비스의 세부 내용은 앱 및 웹사이트 내 안내에 따릅니다." },

        { type: "heading", text: "제4조 (이용계약의 체결 및 미성년자 이용)" },
        {
          type: "list",
          items: [
            "이용자는 당사가 정한 절차에 따라 회원가입을 신청하고, 당사가 이를 승낙함으로써 이용계약이 체결됩니다.",
            "만 14세 미만 아동은 서비스에 가입할 수 없으며, 만 14세 이상 미성년자가 유료 서비스를 이용하는 경우 법정대리인의 동의가 필요합니다. 법정대리인의 동의 없이 체결된 계약은 미성년자 본인 또는 법정대리인이 취소할 수 있습니다.",
          ],
        },

        { type: "heading", text: "제5조 (유료 서비스 및 결제)" },
        { type: "subheading", text: "무료체험" },
        { type: "paragraph", text: "신규 이용자는 가입일로부터 7일간 모든 기능을 무료로 이용할 수 있습니다." },
        { type: "subheading", text: "유료 전환" },
        {
          type: "paragraph",
          text: "무료체험 기간이 종료되면 유료 기능 이용이 제한되며, 별도의 자동결제는 이루어지지 않습니다. 이용자가 유료 플랜을 직접 선택하여 결제를 진행하는 경우에만 정기결제(1인당 월 2,200원)가 청구됩니다.",
        },
        { type: "subheading", text: "팀 결제" },
        {
          type: "paragraph",
          text: "팀 서비스는 팀 관리자가 전체 인원 수만큼 일괄결제(인원수 × 2,200원)하는 방식으로 운영됩니다. 결제 계약의 당사자는 팀 관리자이며, 팀 관리자는 결제 금액 및 팀원 수 변경사항에 대한 책임을 부담합니다.",
        },
        { type: "subheading", text: "자동 갱신 및 해지" },
        {
          type: "paragraph",
          text: "정기결제는 이용자가 해지하지 않는 한 매 결제주기마다 자동으로 갱신됩니다. 이용자는 앱스토어/구글플레이 계정 설정 또는 서비스 내 메뉴를 통해 언제든지 해지할 수 있으며, 해지 시 다음 결제주기부터 청구가 중단됩니다.",
        },
        { type: "subheading", text: "환불" },
        {
          type: "list",
          items: [
            "인앱결제(App Store, Google Play)를 통한 결제는 각 플랫폼의 환불 정책 및 절차를 따릅니다.",
            "웹 결제(팀 일괄결제 등)의 경우, 관련 법령(전자상거래 등에서의 소비자보호에 관한 법률)이 정하는 바에 따라 처리하며, 이미 제공이 개시된 유료 서비스 이용 기간에 대해서는 이용 기간에 비례하여 환불합니다.",
          ],
        },
        {
          type: "paragraph",
          text: "결제 및 구독 상태 변경(해지, 결제 실패 등)이 발생하더라도 당사는 이용자의 데이터를 임의로 삭제하지 않으며, 유료 기능 이용만 제한됩니다. 데이터 삭제는 이용자 본인 요청 또는 팀 삭제 시에만 이루어집니다.",
        },

        { type: "heading", text: "제6조 (이용자 콘텐츠)" },
        {
          type: "list",
          items: [
            "이용자는 서비스에 제출한 콘텐츠(스캔한 명함, 연락처 정보, 프로필 등)에 대한 소유권을 그대로 보유합니다.",
            "이용자는 서비스 제공(저장, OCR 처리, 팀 공유 등)을 위해 필요한 범위 내에서 당사가 해당 콘텐츠를 저장·처리·복제할 수 있는 비독점적, 무상의 제한적 라이선스를 당사에 부여합니다. 이 라이선스는 이용자가 콘텐츠를 삭제하거나 탈퇴하는 즉시 종료됩니다.",
            "이용자는 타인의 명함 등 개인정보가 포함된 콘텐츠를 업로드하는 경우, 관련 법령을 준수할 책임을 지며, 이로 인해 발생하는 제3자와의 분쟁에 대해 당사는 책임을 지지 않습니다.",
          ],
        },

        { type: "heading", text: "제7조 (이용자의 의무 및 이용 제한)" },
        { type: "paragraph", text: "이용자는 다음 행위를 하지 않습니다." },
        {
          type: "list",
          items: [
            "관련 법령을 위반하거나 승인되지 않은 목적으로 서비스를 이용하는 행위",
            "서비스를 역설계, 리버스 엔지니어링하거나 소스코드 추출을 시도하는 행위",
            "서비스 운영을 방해하거나 비정상적인 방법으로 접근을 시도하는 행위",
            "타인의 개인정보, 저작권 등 권리를 침해하는 콘텐츠를 업로드하는 행위",
            "서비스를 이용해 스팸, 악성코드, 불법 정보를 유포하는 행위",
          ],
        },

        { type: "heading", text: "제8조 (게시물의 관리)" },
        {
          type: "list",
          items: [
            "당사는 이용자가 업로드한 콘텐츠가 타인의 권리를 침해하거나 관련 법령 및 본 약관을 위반한다고 판단되는 경우, 사전 통지 없이 해당 콘텐츠의 접근을 제한하거나 삭제할 수 있습니다.",
            "권리 침해를 주장하는 제3자는 당사에 해당 사실을 통지하여 조치를 요청할 수 있으며, 당사는 정보통신망법 등 관련 법령이 정하는 절차에 따라 처리합니다.",
          ],
        },

        { type: "heading", text: "제9조 (지식재산권)" },
        {
          type: "list",
          items: [
            "서비스에 사용된 소프트웨어, 디자인, 로고, 상표 등 당사가 제작한 저작물에 대한 지식재산권은 당사에 귀속됩니다.",
            "이용자는 당사의 사전 서면 동의 없이 서비스의 일부 또는 전부를 복제, 배포, 전송, 출판, 2차적 저작물 작성 등의 방법으로 이용할 수 없습니다.",
          ],
        },

        { type: "heading", text: "제10조 (서비스의 변경 및 중단)" },
        {
          type: "list",
          items: [
            "당사는 운영상, 기술상의 필요에 따라 서비스의 전부 또는 일부를 변경, 추가, 중단할 수 있습니다.",
            "유료 서비스 이용 중 서비스 중단이 발생하는 경우, 당사는 이용자에게 사전 공지하며 관련 법령에 따라 필요한 조치(환불 등)를 취합니다.",
            "천재지변, 시스템 장애, 정기 점검 등 불가피한 사유로 서비스가 일시 중단될 수 있으며, 이 경우 사전 또는 사후에 공지합니다.",
          ],
        },

        { type: "heading", text: "제11조 (보증의 부인)" },
        {
          type: "paragraph",
          text: "서비스는 \"있는 그대로(as is)\" 및 \"제공 가능한 상태로(as available)\" 제공됩니다. 당사는 서비스가 중단 없이, 오류 없이, 완전히 안전하게 제공됨을 보증하지 않으며, 관련 법령이 허용하는 범위 내에서 명시적·묵시적 보증을 하지 않습니다. 다만 이는 당사의 고의 또는 중과실로 인한 책임까지 면제하는 것은 아닙니다.",
        },

        { type: "heading", text: "제12조 (책임의 제한)" },
        {
          type: "list",
          items: [
            "당사는 천재지변, 불가항력, 이용자의 귀책사유로 인한 서비스 장애에 대해 책임을 지지 않습니다.",
            "관련 법령이 허용하는 범위 내에서, 당사는 서비스 이용과 관련하여 발생한 간접적, 부수적, 특별, 결과적 손해에 대해 책임을 지지 않습니다. 단, 당사의 고의 또는 중대한 과실로 인하여 발생한 손해에 대해서는 그러하지 아니합니다.",
            "당사는 이용자가 서비스를 통해 얻은 정보나 자료로 인해 발생한 손해에 대해 당사의 고의 또는 과실이 없는 한 책임을 지지 않습니다.",
          ],
        },

        { type: "heading", text: "제13조 (이용계약의 해지 및 이용제한)" },
        {
          type: "list",
          items: [
            "이용자는 언제든지 서비스 내 설정 메뉴를 통해 이용계약을 해지(회원탈퇴)할 수 있습니다.",
            "이용자가 본 약관을 위반하는 경우, 당사는 사전 통지 후(단, 긴급한 경우 사후 통지) 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.",
          ],
        },

        { type: "heading", text: "제14조 (분쟁해결)" },
        {
          type: "list",
          items: [
            "당사는 이용자로부터 제출되는 불만사항 및 의견을 신속하게 처리하기 위해 노력합니다.",
            "당사와 이용자 간 분쟁이 발생한 경우, 상호 협의하여 해결하도록 노력하며, 협의가 이루어지지 않을 경우 관련 법령 및 상거래 관행에 따릅니다.",
          ],
        },

        { type: "heading", text: "제15조 (준거법 및 관할법원)" },
        {
          type: "list",
          items: [
            "본 약관 및 서비스 이용과 관련하여 당사와 이용자 간에 발생한 분쟁에 대해서는 대한민국 법을 준거법으로 합니다.",
            "분쟁에 관한 소송은 민사소송법상의 관할법원에 제기합니다.",
          ],
        },

        { type: "heading", text: "제16조 (문의)" },
        { type: "paragraph", text: "본 약관에 대해 궁금한 점이 있으시면 globalmarketradar@gmail.com으로 문의해 주세요." },
      ] as LegalBlock[],
      closingNote: "본 약관은 2026년 7월 2일부터 시행합니다.",
    },
    refund: {
      title: "환불정책",
      blocks: [
        { type: "heading", text: "1. 목적" },
        {
          type: "paragraph",
          text: "본 환불정책은 더네이비(이하 \"회사\")가 운영하는 명함 관리 애플리케이션 Cardlogue(이하 \"서비스\")의 유료 구독 상품에 대한 환불 기준 및 절차를 안내합니다. 본 정책은 서비스 이용약관의 일부를 구성하며, 이용약관과 함께 적용됩니다.",
        },

        { type: "heading", text: "2. 무료 체험 기간" },
        {
          type: "paragraph",
          text: "회사는 신규 이용자(게스트 및 정식 가입자 공통)에게 7일간 전체 기능 무료 체험을 제공합니다. 체험 기간 중에는 자동으로 결제가 이루어지지 않으며, 이용자가 별도로 구독 버튼을 눌러 결제를 진행한 경우에만 유료 구독이 시작됩니다. 따라서 체험 기간 자체에 대한 환불 대상은 발생하지 않습니다.",
        },

        { type: "heading", text: "3. 결제 경로에 따른 환불 기준" },
        { type: "paragraph", text: "Cardlogue의 구독 결제는 결제 경로에 따라 아래와 같이 환불 정책이 다르게 적용됩니다." },
        {
          type: "table",
          headers: ["구분", "결제 경로", "환불 기준"],
          rows: [
            ["개인 구독", "앱 내 결제 (인앱결제, In-App Purchase)", "Google Play / App Store의 환불 정책 적용"],
            ["팀 구독", "웹 결제 (PortOne·토스페이먼츠 / Paddle)", "본 정책 4항 기준 적용"],
          ],
        },
        { type: "subheading", text: "3-1. 개인 구독 (인앱결제)" },
        {
          type: "paragraph",
          text: "개인 구독은 각 이용자가 이용 중인 앱 마켓을 통해 결제되며, 환불 신청 및 처리는 해당 마켓의 정책과 절차를 따릅니다.",
        },
        {
          type: "list",
          items: [
            "Android (Google Play): Google Play 계정의 주문 내역에서 환불 요청",
            "iOS (App Store): Apple의 미디어 서비스 약관 및 환불 요청 절차에 따라 처리",
          ],
        },
        { type: "paragraph", text: "회사는 마켓 사업자의 환불 처리 결과에 관여하지 않으며, 환불 승인 여부는 각 마켓의 정책에 따라 결정됩니다." },
        { type: "subheading", text: "3-2. 팀 구독 (웹결제)" },
        {
          type: "paragraph",
          text: "팀 구독은 팀 관리자가 소속 팀원 수에 비례하여 회사가 제공하는 웹 결제 페이지를 통해 직접 결제하는 방식입니다. 이 경우 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항에 따라, 서비스 이용이 개시된 것으로 간주되어 청약철회가 제한될 수 있습니다.",
        },
        {
          type: "callout",
          text: "팀 구독 결제 시, 이용자는 결제 진행 전 \"서비스 이용 개시에 동의하며 청약철회가 제한됨\"을 안내받고 이에 동의한 이후에만 결제가 진행됩니다.",
        },

        { type: "heading", text: "4. 팀 구독 환불 세부 기준" },
        {
          type: "list",
          items: [
            "정액 과금 원칙: 팀 구독료는 매월 1일 기준 팀 소속 인원수 × 2,200원으로 정액 청구되며, 월 중 인원 증감이 있더라도 해당 월 결제 금액은 일할 계산되지 않습니다.",
            "결제 오류로 인한 환불: 회사의 시스템 오류로 인해 중복 결제되었거나 서비스가 정상적으로 제공되지 않은 경우, 확인 후 해당 금액을 환불합니다.",
            "서비스 미이용에 따른 환불: 결제 이후 단순 미이용을 이유로 한 환불은 원칙적으로 제한됩니다. 단, 결제 당일 서비스를 전혀 이용하지 않았음이 확인되는 경우 회사에 문의하여 개별 심사를 받을 수 있습니다.",
            "해지 시점: 팀 구독 해지는 익월부터 적용되며, 이미 결제된 당월 이용료는 환불되지 않습니다.",
          ],
        },

        { type: "heading", text: "5. 계정 및 데이터 처리" },
        {
          type: "paragraph",
          text: "구독이 만료되거나 결제에 실패한 경우에도 회사는 이용자의 데이터를 삭제하지 않습니다. 다만 유료 기능(신규 명함 추가, 팀 생성·참여 등)은 제한되며, 기존에 저장된 명함 및 디지털 명함의 조회·수정·삭제는 계속 허용됩니다.",
        },

        { type: "heading", text: "6. 환불 신청 절차" },
        { type: "paragraph", text: "환불을 원하시는 경우 아래 절차로 문의해 주시기 바랍니다." },
        {
          type: "list",
          items: [
            "인앱결제 이용자: Google Play / App Store 고객센터를 통해 직접 신청",
            "웹결제(팀 구독) 이용자: 하단 사업자 정보의 연락처로 문의",
          ],
        },
        { type: "paragraph", text: "회사는 환불 요청 접수 후 영업일 기준 7일 이내 처리 결과를 안내합니다." },

        { type: "heading", text: "7. 정책 변경" },
        {
          type: "paragraph",
          text: "본 환불정책은 관련 법령 및 서비스 운영상 필요에 따라 개정될 수 있으며, 개정 시 서비스 내 공지 또는 본 페이지를 통해 사전 고지합니다.",
        },

        { type: "heading", text: "사업자 정보" },
        {
          type: "table",
          headers: ["항목", "내용"],
          rows: [
            ["상호명", "더네이비 (The Navy)"],
            ["대표자", "이주형"],
            ["사업자등록번호", "155-26-01968"],
            ["사업장 주소", "경북 포항시 북구 우창로 166 (37627)"],
            ["전화번호", "070-7954-1968"],
            ["이메일", "globalmarketradar@gmail.com"],
          ],
        },
      ] as LegalBlock[],
      closingNote: "본 정책은 2026년 7월 12일부터 시행합니다.",
    },
  },
} as const;

export type Translations = typeof translations.en;
