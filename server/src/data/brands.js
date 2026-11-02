// Brands commonly impersonated in phishing. `keys` are tokens that signal impersonation when they appear
// in a hostname that is NOT one of the brand's official `domains`.
export const BRANDS = [
  { name: 'PayPal', keys: ['paypal', 'paypa1', 'paypai'], domains: ['paypal.com', 'paypal.me'] },
  { name: 'Google', keys: ['google', 'gooogle', 'g00gle', 'gmail'], domains: ['google.com', 'gmail.com', 'googleusercontent.com', 'goo.gl', 'youtube.com', 'google.co.in', 'googleapis.com', 'withgoogle.com'] },
  { name: 'Microsoft', keys: ['microsoft', 'micros0ft', 'office365', 'outlook', 'onedrive', 'sharepoint'], domains: ['microsoft.com', 'live.com', 'office.com', 'outlook.com', 'microsoftonline.com', 'office365.com', 'azure.com', 'windows.com', 'bing.com', 'msn.com', 'skype.com', 'sharepoint.com', 'onedrive.com'] },
  { name: 'Apple', keys: ['apple', 'icloud', 'appleid'], domains: ['apple.com', 'icloud.com', 'me.com'] },
  { name: 'Amazon', keys: ['amazon', 'amaz0n', 'amazn'], domains: ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.de', 'amazonaws.com', 'amzn.to', 'amazon.ca', 'amazon.com.au'] },
  { name: 'Facebook', keys: ['facebook', 'faceb00k', 'fb-login'], domains: ['facebook.com', 'fb.com', 'meta.com', 'messenger.com', 'fb.me'] },
  { name: 'Instagram', keys: ['instagram', 'instagran'], domains: ['instagram.com'] },
  { name: 'WhatsApp', keys: ['whatsapp'], domains: ['whatsapp.com', 'wa.me', 'whatsapp.net'] },
  { name: 'Netflix', keys: ['netflix', 'netfIix'], domains: ['netflix.com', 'nflxext.com'] },
  { name: 'LinkedIn', keys: ['linkedin'], domains: ['linkedin.com', 'lnkd.in'] },
  { name: 'GitHub', keys: ['github'], domains: ['github.com', 'github.io', 'githubusercontent.com', 'githubassets.com'] },
  { name: 'Dropbox', keys: ['dropbox'], domains: ['dropbox.com', 'dropboxusercontent.com'] },
  { name: 'Twitter / X', keys: ['twitter'], domains: ['twitter.com', 'x.com', 't.co'] },
  { name: 'Binance', keys: ['binance'], domains: ['binance.com', 'binance.us'] },
  { name: 'Coinbase', keys: ['coinbase'], domains: ['coinbase.com'] },
  { name: 'MetaMask', keys: ['metamask'], domains: ['metamask.io'] },
  { name: 'Chase', keys: ['chase'], domains: ['chase.com'] },
  { name: 'Bank of America', keys: ['bankofamerica'], domains: ['bankofamerica.com', 'bofa.com'] },
  { name: 'Wells Fargo', keys: ['wellsfargo'], domains: ['wellsfargo.com'] },
  { name: 'DHL', keys: ['dhl'], domains: ['dhl.com', 'dhl.de'] },
  { name: 'FedEx', keys: ['fedex'], domains: ['fedex.com'] },
  { name: 'UPS', keys: ['ups'], domains: ['ups.com'] },
  { name: 'USPS', keys: ['usps'], domains: ['usps.com'] },
  { name: 'SBI', keys: ['onlinesbi', 'sbibank'], domains: ['sbi.co.in', 'onlinesbi.sbi', 'onlinesbi.com', 'sbi.bank.in'] },
  { name: 'HDFC Bank', keys: ['hdfcbank'], domains: ['hdfcbank.com'] },
  { name: 'ICICI Bank', keys: ['icicibank'], domains: ['icicibank.com'] },
  { name: 'Paytm', keys: ['paytm'], domains: ['paytm.com'] },
  { name: 'PhonePe', keys: ['phonepe'], domains: ['phonepe.com'] },
  { name: 'Flipkart', keys: ['flipkart'], domains: ['flipkart.com'] },
  { name: 'IRS', keys: ['irs'], domains: ['irs.gov'] },
  { name: 'eBay', keys: ['ebay'], domains: ['ebay.com'] },
  { name: 'Steam', keys: ['steampowered', 'steamcommunity'], domains: ['steampowered.com', 'steamcommunity.com'] },
  { name: 'Discord', keys: ['discord'], domains: ['discord.com', 'discord.gg', 'discordapp.com'] },
  { name: 'Spotify', keys: ['spotify'], domains: ['spotify.com'] },
  { name: 'Adobe', keys: ['adobe'], domains: ['adobe.com'] },
  { name: 'DocuSign', keys: ['docusign'], domains: ['docusign.com', 'docusign.net'] },
  { name: 'Zoom', keys: ['zoom'], domains: ['zoom.us'] },
  { name: 'Yahoo', keys: ['yahoo'], domains: ['yahoo.com', 'yahoo.co.in'] },
];

// Sites that are well known / used as safe examples. Only used to suppress keyword-style penalties.
export const KNOWN_GOOD = new Set([
  'example.com', 'example.org', 'wikipedia.org', 'mozilla.org', 'stackoverflow.com', 'python.org', 'nodejs.org',
  'npmjs.com', 'react.dev', 'cloudflare.com', 'reddit.com', 'openai.com', 'anthropic.com', 'nytimes.com', 'bbc.com', 'bbc.co.uk',
]);

export const SUSPICIOUS_TLDS = new Set(['zip', 'mov', 'top', 'xyz', 'tk', 'ml', 'ga', 'cf', 'gq', 'click', 'country', 'work', 'rest', 'support', 'loan', 'men', 'icu', 'buzz', 'cyou', 'cfd', 'sbs', 'monster', 'quest', 'kim', 'link', 'download', 'review', 'accountant', 'gdn', 'bid', 'stream', 'win']);

export const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'lnkd.in', 't.ly', 'bl.ink', 'shorte.st', 'v.gd', 'qr.ae']);

export const URL_KEYWORDS = ['login', 'signin', 'sign-in', 'verify', 'verification', 'secure', 'account', 'update', 'confirm', 'banking', 'password', 'wallet', 'billing', 'suspend', 'unlock', 'recover', 'validate', 'authenticate', 'webscr', 'alert', 'security', 'invoice', 'refund', 'claim'];

export const FREE_HOSTS = ['.000webhostapp.com', '.weebly.com', '.wixsite.com', '.web.app', '.firebaseapp.com', '.pages.dev', '.netlify.app', '.vercel.app', '.herokuapp.com', '.blogspot.com', '.duckdns.org', '.no-ip.org', '.ngrok.io', '.ngrok-free.app', '.trycloudflare.com', '.glitch.me', '.repl.co', '.workers.dev', '.godaddysites.com'];

export const EXEC_EXT = new Set(['exe', 'scr', 'msi', 'apk', 'bat', 'cmd', 'vbs', 'jar', 'ps1', 'dmg', 'iso', 'hta', 'lnk', 'com', 'pif', 'js']);
export const ARCHIVE_EXT = new Set(['zip', 'rar', '7z', 'gz', 'tar']);
