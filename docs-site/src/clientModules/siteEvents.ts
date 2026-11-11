import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import {startSiteEvents} from '@site/src/lib/siteEvents';

// Count download clicks on the built site only; `docusaurus start` sends nothing.
if (ExecutionEnvironment.canUseDOM && process.env.NODE_ENV === 'production') {
  startSiteEvents({document, navigator, location});
}
