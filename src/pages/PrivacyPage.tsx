import { Link } from "react-router-dom";
import { school } from "@/config/school";
import {
  PRIVACY_NOTICE_DATE_LABEL,
  PRIVACY_NOTICE_VERSION,
} from "@/config/privacy";

export function PrivacyPage() {
  return (
    <div className="section max-w-3xl py-16">
      <p className="text-sm font-medium tracking-[0.14em] text-ink-soft uppercase">
        Privacy notice
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold">
        How this alumni network uses your information
      </h1>
      <p className="mt-4 text-sm text-ink-soft">
        Last updated {PRIVACY_NOTICE_DATE_LABEL} (notice {PRIVACY_NOTICE_VERSION}
        ). Written in plain language for members, not as a certificate of legal
        compliance.
      </p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink">
        <section>
          <h2 className="text-xl font-semibold">Who runs this</h2>
          <p className="mt-3 text-ink-soft">
            Volunteer alumni of {school.schoolName}, {school.location}. Questions
            go to{" "}
            <a
              href={`mailto:${school.contactEmail}`}
              className="font-medium text-brand hover:underline"
            >
              {school.contactEmail}
            </a>
            . The school name appears because this is that school’s alumni
            network, not because a company is selling the data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">This network is for adults</h2>
          <p className="mt-3 text-ink-soft">
            You must be 18 or older to join. Indian law treats people under 18
            as children for this kind of service. A 10th-standard year on a
            profile is not a reliable age check, so we ask you to confirm you
            are an adult when you agree to this notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">What we keep, and why</h2>
          <p className="mt-3 text-ink-soft">
            Google sign-in gives us your Google name, email and profile photo so
            we can recognise the same person on a later visit. You may add a
            first and last name, 10th-standard year, classes attended, city,
            country, work details, bio, interests and phone number so classmates
            can find you and so two existing members can vouch that you went to
            the school. If you RSVP to an event, we keep that you are going.
            Volunteers who administer the site can see membership status so they
            can run the network.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Who can see it</h2>
          <p className="mt-3 text-ink-soft">
            The public pages (home, about, events list, this notice) do not show
            other members’ personal details. The directory, map and other
            members’ profiles are only for people who have signed in and been
            vouched for. Email and phone stay private unless you change that in{" "}
            <Link to="/settings" className="font-medium text-brand hover:underline">
              Settings
            </Link>
            . We do not sell member lists.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Where it lives</h2>
          <p className="mt-3 text-ink-soft">
            The site is hosted on GitHub Pages. Accounts and profiles are stored
            in Google Firebase (Firestore and Authentication). Those services
            may process data outside India. Sign-in is handled by Google. We do
            not split the product by country: every member sees the same notice
            and the same controls.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Your yes, and taking it back</h2>
          <p className="mt-3 text-ink-soft">
            We ask for a clear yes before you use the network, and we store when
            you agreed and which version of this notice that was. You can erase
            your account from Settings. That removes your profile from the
            directory, your account record, and your event RSVPs. Signing out
            alone does not delete anything.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">How long we keep it</h2>
          <p className="mt-3 text-ink-soft">
            Until you delete the account, or until volunteers remove a profile
            that does not belong here. We do not run advertising profiles on
            this data.
          </p>
        </section>

        <p>
          <Link to="/register" className="font-medium text-brand hover:underline">
            Join the alumni network
          </Link>
          {" · "}
          <Link to="/about" className="font-medium text-brand hover:underline">
            About
          </Link>
        </p>
      </div>
    </div>
  );
}
