// Feature flags matching X's /Bookmarks request (mirrors X's frontend)
const FEATURES = {
  graphql_timeline_v2_bookmark_timeline: true,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: false,
  responsive_web_grok_share_attachment_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  responsive_web_grok_analysis_button_from_backend: true,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_grok_image_annotation_enabled: false,
  responsive_web_enhance_cards_enabled: false,
};

/**
 * Sends a status update to the popup and logs to console.
 * @param {string} message - Status message to display
 */
const updatePopupStatus = (message) => {
  console.log(`Status: ${message}`);
  browser.runtime.sendMessage({ action: "updateStatus", message });
};

/**
 * Fetches all bookmarks recursively from X's GraphQL API and exports them as JSON.
 * @param {string} cursor - Pagination cursor (optional)
 * @param {number} totalImported - Total tweets imported
 * @param {Array} allTweets - Accumulated tweet data
 * @returns {Promise<void>}
 */
const getBookmarks = async (cursor = null, totalImported = 0, allTweets = []) => {
  try {
    updatePopupStatus("Entering getBookmarks...");
    const sessionResult = await browser.storage.session.get(["cookie", "csrf", "auth"]);
    updatePopupStatus(`Session data: cookie=${!!sessionResult.cookie}, csrf=${!!sessionResult.csrf}, auth=${!!sessionResult.auth}`);
    if (!sessionResult.cookie || !sessionResult.csrf || !sessionResult.auth) {
      updatePopupStatus("Missing authentication data. Please log into X and try again.");
      return;
    }

    const localResult = await browser.storage.local.get(["bookmarksApiId"]);
    updatePopupStatus(`Local data: bookmarksApiId=${localResult.bookmarksApiId}`);
    if (!localResult.bookmarksApiId) {
      updatePopupStatus("Bookmarks API ID not found. Please visit X bookmarks first.");
      return;
    }

    const headers = new Headers();
    headers.append("Cookie", sessionResult.cookie);
    headers.append("X-Csrf-Token", sessionResult.csrf);
    headers.append("Authorization", sessionResult.auth);

    const variables = { count: 20, includePromotedContent: true };
    if (cursor) variables.cursor = cursor;
    const apiUrl = `https://x.com/i/api/graphql/${localResult.bookmarksApiId}/Bookmarks?features=${encodeURIComponent(
      JSON.stringify(FEATURES)
    )}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

    updatePopupStatus(`Fetching bookmarks from: ${apiUrl}`);
    const response = await fetch(apiUrl, { method: "GET", headers, redirect: "follow" });
    updatePopupStatus(`Fetch response status: ${response.status}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    updatePopupStatus("Response received, checking data structure...");
    if (!data?.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]?.entries) {
      throw new Error("Invalid API response format");
    }

    const entries = data.data.bookmark_timeline_v2.timeline.instructions[0].entries;
    const tweetEntries = entries.filter((entry) => entry.entryId.startsWith("tweet-"));
    const parsedTweets = tweetEntries.map(parseTweet);
    allTweets.push(...parsedTweets);

    const newTweetsCount = parsedTweets.length;
    totalImported += newTweetsCount;

    const nextCursor = getNextCursor(entries);
    updatePopupStatus(`Found ${newTweetsCount} tweets, total ${totalImported}, nextCursor: ${nextCursor || "none"}`);

    if (nextCursor && newTweetsCount > 0) {
      await getBookmarks(nextCursor, totalImported, allTweets);
    } else {
      updatePopupStatus(`Finished fetching ${totalImported} bookmarks`);
      const timestamp = Date.now();
      const fileName = `bookmarks_${timestamp}.json`;
      const jsonContent = JSON.stringify(allTweets, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      updatePopupStatus(`Initiating download for ${totalImported} bookmarks to ${fileName}`);
      const downloadId = await new Promise((resolve, reject) => {
        browser.downloads.download(
          { url, filename: fileName, saveAs: true },
          (id) => {
            if (browser.runtime.lastError) {
              reject(new Error("Download initiation failed: " + browser.runtime.lastError.message));
            } else {
              resolve(id);
            }
          }
        );
      });

      // Monitor download state and stop once complete or failed
      let isRunning = true;
      const checkDownload = setInterval(async () => {
        if (!isRunning) return;
        const [download] = await browser.downloads.search({ id: downloadId });
        if (download.state === "complete") {
          updatePopupStatus(`Export complete! ${totalImported} bookmarks saved to ${fileName}.`);
          clearInterval(checkDownload);
          URL.revokeObjectURL(url);
          isRunning = false;
        } else if (download.state === "interrupted") {
          updatePopupStatus(`Download failed: ${download.error || "Unknown error"}`);
          clearInterval(checkDownload);
          URL.revokeObjectURL(url);
          isRunning = false;
        }
      }, 500); // Check every 500ms
    }
  } catch (error) {
    updatePopupStatus("Error fetching bookmarks: " + error.message);
  }
};

/**
 * Parses a tweet entry into a simplified object.
 * @param {Object} entry - Raw tweet entry
 * @returns {Object} Parsed tweet data
 */
const parseTweet = (entry) => {
  const tweet =
    entry.content?.itemContent?.tweet_results?.result?.tweet ||
    entry.content?.itemContent?.tweet_results?.result;

  const media = tweet?.legacy?.entities?.media?.[0] || null;

  const getBestVideoVariant = (variants) => {
    if (!variants?.length) return null;
    const mp4Variants = variants.filter((v) => v.content_type === "video/mp4");
    return mp4Variants.reduce((best, current) =>
      current.bitrate && (!best || current.bitrate > best.bitrate) ? current : best,
    null);
  };

  const getMediaInfo = (media) => {
    if (!media) return null;
    if (media.type === "video" || media.type === "animated_gif") {
      const videoInfo = tweet?.legacy?.extended_entities?.media?.[0]?.video_info;
      const bestVariant = getBestVideoVariant(videoInfo?.variants);
      return { type: media.type, source: bestVariant?.url || media.media_url_https };
    }
    return { type: media.type, source: media.media_url_https };
  };

  return {
    id: entry.entryId,
    full_text: tweet?.legacy?.full_text,
    timestamp: tweet?.legacy?.created_at,
    media: getMediaInfo(media),
  };
};

/**
 * Extracts the next pagination cursor.
 * @param {Array} entries - API response entries
 * @returns {string|null} Next cursor or null
 */
const getNextCursor = (entries) => {
  const cursorEntry = entries.find((entry) => entry.entryId.startsWith("cursor-bottom-"));
  return cursorEntry ? cursorEntry.content.value : null;
};

/**
 * Waits for required authentication data with explicit failure details.
 * @returns {Promise<void>}
 */
const waitForRequiredData = () => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50; // ~5 seconds
    const checkData = () => {
      attempts++;
      browser.storage.session.get(["cookie", "csrf", "auth"]).then((session) => {
        browser.storage.local.get(["bookmarksApiId"]).then((local) => {
          const missing = [];
          if (!session.cookie) missing.push("cookie");
          if (!session.csrf) missing.push("csrf");
          if (!session.auth) missing.push("auth");
          if (!local.bookmarksApiId) missing.push("bookmarksApiId");
          if (missing.length === 0) {
            updatePopupStatus("All required data found");
            resolve();
          } else if (attempts >= maxAttempts) {
            updatePopupStatus(`Timeout after ${attempts} attempts. Missing: ${missing.join(", ")}`);
            reject(new Error("Timeout: Required data not found"));
          } else {
            setTimeout(checkData, 100);
          }
        });
      });
    };
    checkData();
  });
};

// Handle messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportBookmarks") {
    updatePopupStatus(
      "Starting export. Note: This uses an undocumented API and may violate X's Terms of Service."
    );
    browser.tabs.create({ url: "https://x.com/i/bookmarks/all" });

    updatePopupStatus("Waiting for required data...");
    waitForRequiredData()
      .then(() => {
        updatePopupStatus("Data check passed, proceeding to fetch bookmarks");
        getBookmarks().catch((error) => {
          updatePopupStatus("getBookmarks failed: " + error.message);
        });
        sendResponse({ status: "started" });
      })
      .catch((error) => {
        updatePopupStatus("Wait failed: " + error.message);
      });

    return true; // Async response
  } else if (request.action === "updateStatus") {}
});

// Capture authentication headers and API ID
browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    console.log(`webRequest fired for URL: ${details.url}`);
    if (!details.url.includes("x.com") && !details.url.includes("twitter.com")) {
      return;
    }

    const authHeader = details.requestHeaders.find(
      (h) => h.name.toLowerCase() === "authorization"
    );
    const cookieHeader = details.requestHeaders.find(
      (h) => h.name.toLowerCase() === "cookie"
    );
    const csrfHeader = details.requestHeaders.find(
      (h) => h.name.toLowerCase() === "x-csrf-token"
    );

    const auth = authHeader?.value || "";
    const cookie = cookieHeader?.value || "";
    const csrf = csrfHeader?.value || "";

    if (auth || cookie || csrf) {
      browser.storage.session.set({ cookie, csrf, auth });
      updatePopupStatus(
        `Captured headers: auth=${!!auth}, cookie=${!!cookie}, csrf=${!!csrf}`
      );
    }

    const bookmarksUrlPattern = /https:\/\/x\.com\/i\/api\/graphql\/([^/]+)\/Bookmarks/;
    if (details.url.match(bookmarksUrlPattern)) {
      const bookmarksApiId = details.url.match(bookmarksUrlPattern)[1];
      browser.storage.local.set({ bookmarksApiId });
      updatePopupStatus(`Captured bookmarksApiId: ${bookmarksApiId}`);
    } else {
      console.log(`No Bookmarks match for: ${details.url}`);
    }
  },
  { urls: ["*://x.com/*", "*://twitter.com/*"] },
  ["requestHeaders"]
);