const features = {
  graphql_timeline_v2_bookmark_timeline: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
};

const getBookmarks = async (cursor = "", totalImported = 0, allTweets = []) => {
  chrome.storage.local.get(
    ["cookie", "csrf", "auth"],
    async (sessionResult) => {
      if (
        !sessionResult.cookie ||
        !sessionResult.csrf ||
        !sessionResult.auth
      ) {
        console.error("cookie, csrf, or auth is missing");
        return;
      } 

      chrome.storage.local.get(["bookmarksApiId"], async (localResult) => {
        if (!localResult.bookmarksApiId) {
          return;
        }

        const headers = new Headers();
        headers.append("Cookie", sessionResult.cookie);
        headers.append("X-Csrf-token", sessionResult.csrf);
        headers.append("Authorization", sessionResult.auth);

        const variables = {
          count: 100,
          cursor: cursor,
          includePromotedContent: false,
        };
        const API_URL = `https://x.com/i/api/graphql/${
          localResult.bookmarksApiId
        }/Bookmarks?features=${encodeURIComponent(
          JSON.stringify(features)
        )}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

        console.log("API_URL", API_URL);

        try {
          const response = await fetch(API_URL, {
            method: "GET",
            headers: headers,
            redirect: "follow",
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const entries =
            data.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]
              ?.entries || [];
          
          const tweetEntries = entries.filter((entry) =>
            entry.entryId.startsWith("tweet-")
          );
          console.log("Raw Tweets", tweetEntries);
          
          const parsedTweets = tweetEntries.map(parseTweet);
          console.log("Parsed Tweets", parsedTweets);
          allTweets = allTweets.concat(parsedTweets);
          
          const newTweetsCount = parsedTweets.length;
          totalImported += newTweetsCount;

          console.log("Bookmarks data:", data);
          console.log("New tweets in this batch:", newTweetsCount);
          console.log("Current total imported:", totalImported);

          const nextCursor = getNextCursor(entries);

          if (nextCursor && newTweetsCount > 0) {
            await getBookmarks(nextCursor, totalImported, allTweets);
          } else {
            console.log("Import completed. Total imported:", totalImported);
            console.log("All imported tweets:", allTweets);
            
            // Create and download JSON file
            const timestamp = Date.now();
            const fileName = `bookmarks_${timestamp}.json`;
            const jsonContent = JSON.stringify(allTweets, null, 2);
            
            const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
            
            chrome.downloads.download({
              url: dataUrl,
              filename: fileName, 
              saveAs: true
            }, (downloadId) => {
              if (chrome.runtime.lastError) {
                console.error("Error downloading file:", chrome.runtime.lastError);
              } else {
                console.log("File downloaded successfully. Download ID:", downloadId);
              }
            });
          }
        } catch (error) {
          console.error("Error fetching bookmarks:", error);

        }
      });
    }
  );
}

const parseTweet = (entry) => {
  const tweet = entry.content?.itemContent?.tweet_results?.result?.tweet || entry.content?.itemContent?.tweet_results?.result;
  //console.log("tweet: ", tweet);

  // Safely access media, handling potential undefined values
  const media = tweet?.legacy?.entities?.media?.[0] || null;

  const getBestVideoVariant = (variants) => {
    if (!variants || variants.length === 0) return null;
    const mp4Variants = variants.filter(v => v.content_type === "video/mp4");
    return mp4Variants.reduce((best, current) => {
      if (!best || (current.bitrate && current.bitrate > best.bitrate)) {
        return current;
      }
      return best;
    }, null);
  };

  const getMediaInfo = (media) => {
    if (!media) return null;

    if (media.type === 'video' || media.type === 'animated_gif') {
      const videoInfo = tweet?.legacy?.extended_entities?.media?.[0]?.video_info;
      const bestVariant = getBestVideoVariant(videoInfo?.variants);
      return {
        type: media.type,
        source: bestVariant?.url || media.media_url_https,
      };
    }

    return {
      type: media.type,
      source: media.media_url_https,
    };
  };

  return {
    id: entry.entryId,
    full_text: tweet?.legacy?.full_text,
    timestamp: tweet?.legacy?.created_at,
    media: getMediaInfo(media),
    // favorite_count: tweet?.legacy?.favorite_count,
    // retweet_count: tweet?.legacy?.retweet_count,
    // reply_count: tweet?.legacy?.reply_count,
    // quote_count: tweet?.legacy?.quote_count,
    // lang: tweet?.legacy?.lang
  }; 
};

const getNextCursor = (entries) => {
  const cursorEntry = entries.find(entry => entry.entryId.startsWith("cursor-bottom-"));
  return cursorEntry ? cursorEntry.content.value : null;
};

const waitForRequiredData = () => {
  return new Promise((resolve) => {
    const checkData = () => {
      chrome.storage.local.get(['bookmarksApiId', 'cookie', 'csrf', 'auth'], (result) => {
        if (result.bookmarksApiId && result.cookie && result.csrf && result.auth) {
          console.log('Got all data needed to fetch bookmarks, going to getBookmarks');
          resolve();
        } else {
          setTimeout(checkData, 100); // Check again after 100ms
        }
      });
    };
    checkData();
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "exportBookmarks") {
    chrome.tabs.create({ url: "https://x.com/i/bookmarks/all" });
    console.log("Received export request from popup");

    waitForRequiredData().then(() => {
      getBookmarks();
      sendResponse({ status: "started" });
    });

    return true; // Indicates that the response is sent asynchronously
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (
      !(details.url.includes("x.com") || details.url.includes("twitter.com"))
    ) {
      return;
    }

    // Check if stuff is already stored
    chrome.storage.local.get(["bookmarksApiId", "cookie", "csrf", "auth"], (result) => {
      // Check if the URL matches the pattern for bookmarks API
      const bookmarksUrlPattern = /https:\/\/x\.com\/i\/api\/graphql\/([^/]+)\/Bookmarks\?/;
      const match = details.url.match(bookmarksUrlPattern);

      if (match && !result.bookmarksApiId) {
        const bookmarksApiId = match[1];
        chrome.storage.local.set({ bookmarksApiId }, () => {
          console.log(`Stored bookmarksApiId: ${bookmarksApiId}`);
        });
      }

      const authHeader = details.requestHeaders?.find(
        (header) => header.name.toLowerCase() === "authorization"
      );
      const auth = authHeader ? authHeader.value : "";

      const cookieHeader = details.requestHeaders?.find(
        (header) => header.name.toLowerCase() === "cookie"
      );
      const cookie = cookieHeader ? cookieHeader.value : "";

      const csrfHeader = details.requestHeaders?.find(
        (header) => header.name.toLowerCase() === "x-csrf-token"
      );
      const csrf = csrfHeader ? csrfHeader.value : "";

      if (!auth || !cookie || !csrf) {
        return;
      }

      if (result.cookie !== cookie || result.csrf !== csrf || result.auth !== auth) {
        chrome.storage.local.set({ cookie, csrf, auth }, () => {
          console.log("Updated cookie, csrf, and auth in local storage");
        });
      }
    });
  },
  { urls: ["*://x.com/*", "*://twitter.com/*"] },
  ["requestHeaders", "extraHeaders"]
);
