import {redirect} from 'next/navigation';
/** Keep existing deep links valid while using one Marketing Studio app launcher. */
export default function MarketingEngineLanding(){redirect('/vendor/marketing');}
