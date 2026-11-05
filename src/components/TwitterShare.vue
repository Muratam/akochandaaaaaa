<template>
  <a :href="shareUrl" rel="noopener" @click.prevent="share"><slot /></a>
</template>

<script>
// vue-social-sharing の <ShareNetwork network="Twitter"> の置き換え (Vue 3 対応の安定版が無いため)
export default {
  name: "TwitterShare",
  props: {
    url: { type: String, default: "" },
    title: { type: String, default: "" },
    hashtags: { type: String, default: "" },
  },
  computed: {
    shareUrl() {
      const params = new URLSearchParams();
      if (this.title) params.set("text", this.title);
      if (this.url) params.set("url", this.url);
      if (this.hashtags) params.set("hashtags", this.hashtags);
      return `https://twitter.com/intent/tweet?${params.toString()}`;
    },
  },
  methods: {
    share() {
      const width = 626;
      const height = 436;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        this.shareUrl,
        "sharer-twitter",
        `status=no,resizable=yes,width=${width},height=${height},left=${left},top=${top}`
      );
      if (popup) popup.opener = null;
      else window.location.href = this.shareUrl;
    },
  },
};
</script>
