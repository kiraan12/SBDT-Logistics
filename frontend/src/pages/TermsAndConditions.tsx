import { Link } from "react-router-dom";
import { Truck, ArrowLeft } from "lucide-react";

export default function TermsAndConditions() {
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
            <Truck className="w-6 h-6 text-black" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">SBDT</span>
        </div>

        <h1 className="text-4xl font-black tracking-tight mb-2">Terms and Conditions</h1>
        <p className="text-slate-500 text-sm mb-2">Tamilnadu Trailer Service</p>
        <p className="text-slate-500 text-sm mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-10 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">Nature and Risk</h2>
            <p className="text-slate-400">
              The nature, contents, condition, and value of the consignment are unknown to Tamilnadu Trailer Service (hereinafter referred to as &ldquo;the Company&rdquo;). All goods are accepted and transported at the owner&rsquo;s risk and are deemed to be properly packed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Delivery Time</h2>
            <p className="text-slate-400">
              The Company does not guarantee delivery within any specified time. The Company shall not be liable for any delay in transportation or delivery unless such delay is caused by proven negligence or default of the Company, its agents, or employees.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Change of Route</h2>
            <p className="text-slate-400">
              In the event of interruption or disruption of the booked or customary route due to circumstances beyond the Company&rsquo;s control, the Company may, at its discretion, transport the goods through the next available open route. The terms and conditions applicable to the original route shall continue to apply notwithstanding any change of route or carrier.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Limitation of Liability</h2>
            <p className="text-slate-400">
              The Company shall not be liable for any loss, damage, deterioration, or delay caused by pilferage, leakage, breakage, theft, weather conditions, strikes, riots, civil disturbances, fire, explosion, accidents, or any force majeure event, provided that reasonable precautions have been taken.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Godown (Storage) Charges</h2>
            <p className="text-slate-400 mb-3">
              Delivery must be taken within 7 days of arrival at the Company&rsquo;s godown. Failing this:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>Storage charges at ₹0.20 per quintal (or part thereof) per day will be charged for up to 30 days.</li>
              <li>Thereafter, ₹0.50 per quintal per day will be charged until delivery.</li>
            </ul>
            <p className="text-slate-400 mt-3">
              The consignee or receipt holder must ascertain the arrival date and time from the Company.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Delivery Conditions</h2>
            <p className="text-slate-400">
              The Company shall deliver the goods in the same order and condition as received to the consignee, their authorized representative, or the holder of the receipt. The original receipt must be surrendered at the time of delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Re-weighment and Reclassification</h2>
            <p className="text-slate-400">
              The Company reserves the right to re-weigh, re-measure, reclassify, and revise freight charges at the destination, if required. The customer is responsible for any discrepancy, illegal goods, octroi, taxes, penalties, or other statutory charges.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Right to Refuse Goods</h2>
            <p className="text-slate-400">
              The Company reserves the right to refuse acceptance of any goods for transportation without assigning any reason.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Disposal of Undelivered Goods</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-2">
              <li>Perishable goods remaining undelivered after 48 hours of arrival may be disposed of without notice.</li>
              <li>Other goods remaining undelivered after 30 days may be disposed of after written notice to the consignor or interested party.</li>
            </ul>
            <p className="text-slate-400 mt-3">
              The claimant shall be entitled to the sale proceeds after deduction of freight, storage, and other charges.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Government Action</h2>
            <p className="text-slate-400">
              The Company shall not be responsible for goods detained, seized, or confiscated by Government authorities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Payment of Charges</h2>
            <p className="text-slate-400">
              All freight and incidental charges shall be payable at the Company&rsquo;s Bangalore office or any other mutually agreed location.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Subcontracting of Transport</h2>
            <p className="text-slate-400">
              The Company reserves the right to entrust the goods to any other carrier or transport service. Such carrier shall be deemed to act as the Company&rsquo;s agent, and the Company shall remain responsible for safe delivery to the destination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Time Limit for Enquiries</h2>
            <p className="text-slate-400">
              No enquiry regarding any consignment will be entertained after 30 days from the date of delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Claims Procedure</h2>
            <p className="text-slate-400">
              No claim or legal action shall be initiated against the Company unless a written claim is submitted within 30 days from the date of booking or arrival of the consignment at the destination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">Jurisdiction</h2>
            <p className="text-slate-400">
              All disputes, claims, and matters arising out of this consignment shall be subject to the exclusive jurisdiction of the courts in Bangalore City.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-700 flex flex-wrap gap-4">
          <Link to="/privacy" className="text-sm font-bold text-primary hover:underline">Privacy Policy</Link>
          <Link to="/portfolio" className="text-sm font-bold text-slate-500 hover:text-white">Portfolio</Link>
        </div>
      </div>
    </div>
  );
}
