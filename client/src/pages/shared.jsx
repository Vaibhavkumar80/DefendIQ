import { Link2, Mail, Brain, ShieldCheck, Zap } from 'lucide-react';

export const FEATURES = [
  { icon: Link2, c: 'c-teal', title: 'URL Scanning', text: 'Check suspicious links and websites for signs of malicious content.' },
  { icon: Mail, c: 'c-purple', title: 'Email Analysis', text: 'Detect phishing emails, spoofing and harmful attachments.' },
  { icon: Brain, c: 'c-blue', title: 'Threat Intelligence', text: 'Match links against recently refreshed community threat feeds.' },
  { icon: ShieldCheck, c: 'c-orange', title: 'Smart Detection', text: 'Rule engine plus a local ML model for accurate, explainable results.' },
  { icon: Zap, c: 'c-purple', title: 'Instant Results', text: 'Get detailed reports in seconds, not minutes.' },
];
