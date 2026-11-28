'use client';
import {openAnalyticsPreferences} from './GoogleAnalyticsTracker';
export default function AnalyticsPreferencesLink(){
 return <button type="button" onClick={openAnalyticsPreferences} className="my-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-semibold underline">Analytics preferences</button>;
}
