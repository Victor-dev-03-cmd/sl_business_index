export const postToFacebook = async (businessData: { name: string; profileLink: string }) => {
  const FB_PAGE_ID = process.env.FB_PAGE_ID;
  const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!FB_PAGE_ID || !FB_PAGE_ACCESS_TOKEN) {
    console.error('Facebook configuration is missing (FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN)');
    return { success: false, error: 'Configuration missing' };
  }

  const message = `Welcome ${businessData.name} to SL Business Index! 🚀 Explore their services and location here: ${businessData.profileLink}`;
  const url = `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/feed`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        access_token: FB_PAGE_ACCESS_TOKEN,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Facebook API failure:', data);
      return { success: false, error: data.error?.message || 'Unknown Facebook API error' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Network error during Facebook post:', error);
    return { success: false, error: 'Network error' };
  }
};
