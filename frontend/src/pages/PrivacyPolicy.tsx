import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-16">
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolio
        </Link>

        <div className="flex items-center gap-3 mb-10">
          <div className="bg-white p-2 rounded-xl">
            <Shield className="w-6 h-6 text-black" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">SBDT</span>
        </div>

        <h1 className="text-4xl font-black tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-2">SBDT Logistics / Tamilnadu Trailer Service</p>
        <p className="text-slate-500 text-sm mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">Introduction</h2>
            <p className="text-slate-400">
              SBDT Logistics (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Company&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and disclose information when you use our logistics and shipment tracking services, including our website and operations management console.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Information We Collect</h2>
            <p className="text-slate-400 mb-3">We may collect:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li><strong className="text-slate-300">Account information:</strong> name, email address, phone number, and role when you use our systems.</li>
              <li><strong className="text-slate-300">Shipment and consignment data:</strong> consignor/consignee details, addresses, LR numbers, invoices, and related documents necessary for logistics operations.</li>
              <li><strong className="text-slate-300">Usage data:</strong> how you access and use our services (e.g. IP address, browser type, actions within the console).</li>
              <li><strong className="text-slate-300">Documents:</strong> proof of delivery (POD), scanned documents, and other files you upload or we generate.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">How We Use Your Information</h2>
            <p className="text-slate-400">
              We use the information we collect to provide, operate, and improve our logistics and tracking services; to process shipments and generate LR copies; to communicate with you; to comply with legal and regulatory obligations; and to protect the security of our systems and users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Sharing and Disclosure</h2>
            <p className="text-slate-400">
              We do not sell your personal information. We may share data with service providers who assist in operating our systems (e.g. hosting, support), with authorities when required by law, and with parties directly involved in a shipment (e.g. consignee details for delivery) as necessary for our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Data Security</h2>
            <p className="text-slate-400">
              We implement appropriate technical and organisational measures to protect your data against unauthorised access, alteration, disclosure, or destruction. Access to the operations console and shipment data is restricted by role and authentication.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Data Retention</h2>
            <p className="text-slate-400">
              We retain account and shipment data for as long as needed to provide our services, resolve disputes, and comply with legal and operational requirements. You may request deletion of personal data subject to applicable law and our retention obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Your Rights</h2>
            <p className="text-slate-400">
              Depending on applicable law, you may have the right to access, correct, or delete your personal data, or to object to or restrict certain processing. To exercise these rights or for any privacy-related queries, please contact us using the details provided on our website or in your contract.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Changes to This Policy</h2>
            <p className="text-slate-400">
              We may update this Privacy Policy from time to time. The &ldquo;Last updated&rdquo; date at the top indicates when the policy was last revised. Continued use of our services after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Contact</h2>
            <p className="text-slate-400">
              For questions about this Privacy Policy or our data practices, please contact SBDT Logistics at <a href="mailto:sbdt.transport@gmail.com" className="text-primary hover:underline">sbdt.transport@gmail.com</a> or the contact details provided on our website or in your agreement.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-700 flex flex-wrap gap-4">
          <Link to="/terms" className="text-sm font-bold text-primary hover:underline">Terms and Conditions</Link>
          <Link to="/portfolio" className="text-sm font-bold text-slate-400 hover:text-white">Portfolio</Link>
        </div>
      </div>
    </div>
  );
}
