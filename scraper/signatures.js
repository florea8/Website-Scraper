// each rule has:
//   name    what to call it in the output
//   location:   which part of the response to look at:
//               "html"        raw HTML body
//               "meta"        <meta> tag strings
//               "scripts"     src/href values from <script> and <link> tags
//               "inline_js"   content of inline <script> blocks
//               "css_classes" class="..." attribute values
//               "header"      a specific HTTP response header
//               "cookies"     Set-Cookie header names
//   pattern:  regex to match against that part
const signatures = [

  // -- CMS ------------------------------------------------------------------
  { name: "WordPress",          location: "html",      pattern: /\/wp-content\/|\/wp-includes\//i },
  { name: "Drupal",             location: "html",      pattern: /\/sites\/default\/files\/|Drupal\.settings/i },
  { name: "Joomla",             location: "html",      pattern: /\/components\/com_/i },
  { name: "TYPO3",              location: "html",      pattern: /typo3/i },
  { name: "Ghost",              location: "html",      pattern: /ghost\.org/i },
  { name: "Wix",                location: "html",      pattern: /wix\.com/i },
  { name: "Squarespace",        location: "html",      pattern: /squarespace\.com/i },
  { name: "Webflow",            location: "html",      pattern: /webflow\.com/i },
  { name: "HubSpot CMS",        location: "html",      pattern: /hubspot\.com/i },
  { name: "Contentful",         location: "html",      pattern: /contentful/i },

  // -- E-commerce ------------------------------------------------------------
  { name: "WooCommerce",        location: "html",      pattern: /woocommerce/i },
  { name: "Shopify",            location: "html",      pattern: /cdn\.shopify\.com/i },
  { name: "Magento",            location: "html",      pattern: /Magento_/i },
  { name: "PrestaShop",         location: "html",      pattern: /prestashop/i },
  { name: "BigCommerce",        location: "html",      pattern: /bigcommerce\.com/i },
  { name: "OpenCart",           location: "html",      pattern: /route=common\/home/i },

  // -- JS Frameworks ---------------------------------------------------------
  { name: "React",              location: "scripts",   pattern: /react(\.production\.min|\.development|[-_]dom)/i },
  { name: "Next.js",            location: "html",      pattern: /_next\/static/i },
  { name: "Nuxt.js",            location: "html",      pattern: /_nuxt\//i },
  { name: "Vue.js",             location: "scripts",   pattern: /vue(\.min|@\d).*\.js/i },
  { name: "Angular",            location: "html",      pattern: /ng-version=/i },
  { name: "Svelte",             location: "html",      pattern: /__svelte/i },
  { name: "Gatsby",             location: "inline_js", pattern: /___gatsby/ },
  { name: "Remix",              location: "html",      pattern: /__remixContext/i },
  { name: "Astro",              location: "html",      pattern: /astro-island/i },
  { name: "Alpine.js",          location: "html",      pattern: /x-data=["']/ },
  { name: "HTMX",               location: "html",      pattern: /hx-get=|hx-post=/ },
  { name: "jQuery",             location: "scripts",   pattern: /jquery[.-][\d.]+(?:\.min)?\.js/i },
  { name: "Ember.js",           location: "scripts",   pattern: /ember(?:\.min)?\.js/i },
  { name: "Backbone.js",        location: "scripts",   pattern: /backbone(?:\.min)?\.js/i },

  // -- CSS / UI Frameworks ---------------------------------------------------
  { name: "Bootstrap",          location: "html",      pattern: /bootstrap(?:\.min)?\.(?:css|js)/i },
  { name: "Tailwind CSS",       location: "html",      pattern: /tailwindcss/i },
  { name: "Foundation",         location: "scripts",   pattern: /foundation(?:\.min)?\.js/i },
  { name: "Bulma",              location: "html",      pattern: /bulma(?:\.min)?\.css/i },
  { name: "Material UI",        location: "html",      pattern: /MuiButton|MuiTypography/ },

  // -- Analytics & Marketing -------------------------------------------------
  { name: "Google Analytics",   location: "inline_js", pattern: /gtag\(|GoogleAnalyticsObject/i },
  { name: "Google Tag Manager", location: "html",      pattern: /googletagmanager\.com\/gtm\.js/i },
  { name: "Hotjar",             location: "inline_js", pattern: /hotjar/i },
  { name: "Segment",            location: "inline_js", pattern: /analytics\.load\(/i },
  { name: "Mixpanel",           location: "inline_js", pattern: /mixpanel\.init\(/i },
  { name: "Facebook Pixel",     location: "inline_js", pattern: /fbq\('init'/ },
  { name: "HubSpot",            location: "scripts",   pattern: /js\.hs-scripts\.com/i },
  { name: "Intercom",           location: "inline_js", pattern: /Intercom\(/ },
  { name: "Drift",              location: "inline_js", pattern: /drift\.load\(/ },

  // -- CDN & Infrastructure --------------------------------------------------
  { name: "Cloudflare",         location: "header",    pattern: /.+/,               header: "cf-ray" },
  { name: "Fastly",             location: "header",    pattern: /fastly/i,           header: "x-served-by" },
  { name: "AWS CloudFront",     location: "header",    pattern: /cloudfront/i,       header: "via" },

  // -- Web Servers -----------------------------------------------------------
  { name: "Apache",             location: "header",    pattern: /apache/i,           header: "server" },
  { name: "Nginx",              location: "header",    pattern: /nginx/i,            header: "server" },
  { name: "IIS",                location: "header",    pattern: /microsoft-iis/i,    header: "server" },
  { name: "LiteSpeed",          location: "header",    pattern: /litespeed/i,        header: "server" },
  { name: "OpenResty",          location: "header",    pattern: /openresty/i,        header: "server" },
  { name: "Caddy",              location: "header",    pattern: /caddy/i,            header: "server" },

  // -- Backend / Language ----------------------------------------------------
  { name: "PHP",                location: "header",    pattern: /php/i,              header: "x-powered-by" },
  { name: "ASP.NET",            location: "header",    pattern: /asp\.net/i,         header: "x-powered-by" },
  { name: "Node.js",            location: "header",    pattern: /node\.js/i,         header: "x-powered-by" },
  { name: "Ruby on Rails",      location: "header",    pattern: /phusion passenger/i, header: "server" },
  { name: "Django",             location: "cookies",   pattern: /^csrftoken$/ },
  { name: "Laravel",            location: "cookies",   pattern: /^laravel_session/ },

  // -- Payments --------------------------------------------------------------
  { name: "Stripe",             location: "scripts",   pattern: /js\.stripe\.com/i },
  { name: "PayPal",             location: "scripts",   pattern: /paypal\.com\/sdk/i },
  { name: "Klarna",             location: "scripts",   pattern: /klarna\.com/i },
  { name: "Affirm",             location: "scripts",   pattern: /cdn1\.affirm\.com/i },
  { name: "Mollie",             location: "scripts",   pattern: /mollie\.com/i },
  { name: "Square",             location: "scripts",   pattern: /squareup\.com/i },

  // -- Live Chat & Support ---------------------------------------------------
  { name: "Zendesk",            location: "scripts",   pattern: /static\.zdassets\.com|zopim\.com/i },
  { name: "Tawk.to",            location: "scripts",   pattern: /tawk\.to/i },
  { name: "LiveChat",           location: "scripts",   pattern: /livechatinc\.com/i },
  { name: "Crisp",              location: "inline_js", pattern: /\$crisp\.push/i },
  { name: "Tidio",              location: "scripts",   pattern: /tidio/i },
  { name: "Freshchat",          location: "scripts",   pattern: /wchat\.freshchat\.com/i },
  { name: "Olark",              location: "inline_js", pattern: /olark\.identify\(/i },

  // -- Analytics (extended) --------------------------------------------------
  { name: "Amplitude",          location: "inline_js", pattern: /amplitude\.getInstance\(\)|amplitude\.init\(/i },
  { name: "Microsoft Clarity",  location: "scripts",   pattern: /clarity\.ms\/tag/i },
  { name: "FullStory",          location: "scripts",   pattern: /fullstory\.com\/s\/fs\.js/i },
  { name: "Crazy Egg",          location: "scripts",   pattern: /script\.crazyegg\.com/i },
  { name: "Matomo",             location: "inline_js", pattern: /piwik\.push|matomo\.push/i },
  { name: "Plausible",          location: "scripts",   pattern: /plausible\.io/i },
  { name: "Heap",               location: "inline_js", pattern: /heap\.load\(/i },
  { name: "Lucky Orange",       location: "scripts",   pattern: /luckyorange\.com/i },

  // -- Email & Marketing Automation ------------------------------------------
  { name: "Klaviyo",            location: "scripts",   pattern: /a\.klaviyo\.com/i },
  { name: "Mailchimp",          location: "scripts",   pattern: /chimpstatic\.com|list-manage\.com/i },
  { name: "ActiveCampaign",     location: "inline_js", pattern: /activehosted\.com/i },
  { name: "Omnisend",           location: "scripts",   pattern: /omnisrc\.com|omnisend\.com/i },
  { name: "Brevo",              location: "scripts",   pattern: /sibautomation\.com|sendinblue\.com/i },
  { name: "Drip",               location: "inline_js", pattern: /dc\.drip\.com|_dcq\.push/i },

  // -- Social Pixels ---------------------------------------------------------
  { name: "LinkedIn Insight",   location: "inline_js", pattern: /_linkedin_partner_id|linkedin\.com\/insight/i },
  { name: "TikTok Pixel",       location: "inline_js", pattern: /ttq\.load\(|TiktokAnalyticsObject/i },
  { name: "Pinterest Tag",      location: "inline_js", pattern: /pintrk\(/i },
  { name: "Snapchat Pixel",     location: "inline_js", pattern: /snaptr\(/i },
  { name: "Twitter Pixel",      location: "inline_js", pattern: /twq\('init'/ },

  // -- Maps ------------------------------------------------------------------
  { name: "Google Maps",        location: "scripts",   pattern: /maps\.googleapis\.com/i },
  { name: "Mapbox",             location: "scripts",   pattern: /api\.mapbox\.com/i },
  { name: "Leaflet",            location: "scripts",   pattern: /leaflet(?:\.min)?\.js/i },

  // -- Video -----------------------------------------------------------------
  { name: "Wistia",             location: "scripts",   pattern: /wistia\.com/i },
  { name: "Vimeo",              location: "html",      pattern: /player\.vimeo\.com/i },
  { name: "JW Player",          location: "scripts",   pattern: /jwpcdn\.com|jwplayer\.com/i },
  { name: "YouTube Embed",      location: "html",      pattern: /youtube\.com\/embed/i },

  // -- Fonts & Assets --------------------------------------------------------
  { name: "Google Fonts",       location: "html",      pattern: /fonts\.googleapis\.com/i },
  { name: "Adobe Fonts",        location: "scripts",   pattern: /use\.typekit\.net/i },

  // -- SEO Plugins -----------------------------------------------------------
  { name: "Yoast SEO",          location: "html",      pattern: /yoast\.com\//i },
  { name: "Rank Math",          location: "html",      pattern: /rank-math|rankmath/i },

  // -- Cookie Consent --------------------------------------------------------
  { name: "OneTrust",           location: "scripts",   pattern: /onetrust\.com/i },
  { name: "Cookiebot",          location: "scripts",   pattern: /cookiebot\.com/i },
  { name: "CookieYes",          location: "scripts",   pattern: /cookieyes\.com/i },

  // -- Tag Management --------------------------------------------------------
  { name: "Tealium",            location: "scripts",   pattern: /tags\.tiqcdn\.com/i },

  // -- Reviews & Social Proof ------------------------------------------------
  { name: "Trustpilot",         location: "scripts",   pattern: /widget\.trustpilot\.com/i },
  { name: "Yotpo",              location: "scripts",   pattern: /yotpo\.com/i },

  // -- Notifications ---------------------------------------------------------
  { name: "OneSignal",          location: "scripts",   pattern: /onesignal\.com/i },

  // -- WordPress Page Builders -----------------------------------------------
  { name: "Elementor",          location: "css_classes", pattern: /elementor-widget|elementor-section/i },
  { name: "WPBakery",           location: "html",      pattern: /wpb_wrapper|vc_row/i },
  { name: "Divi",               location: "css_classes", pattern: /et_pb_section|et_pb_row/i },

  // -- Security & Bot Protection ---------------------------------------------
  { name: "Google reCAPTCHA",   location: "scripts",   pattern: /google\.com\/recaptcha/i },
  { name: "hCaptcha",           location: "scripts",   pattern: /hcaptcha\.com/i },
  { name: "Cloudflare Turnstile", location: "scripts", pattern: /challenges\.cloudflare\.com/i },

];

export default signatures;
