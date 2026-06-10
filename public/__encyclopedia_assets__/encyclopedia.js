
    (() => {
      const shareButtons = document.querySelectorAll("[data-share-platform]");
      for (const button of shareButtons) {
        button.addEventListener("click", () => {
          const url = button.getAttribute("data-share-url") || location.href;
          const platform = button.getAttribute("data-share-platform") || "";
          const text = button.getAttribute("data-share-title") || document.title;
          const encodedUrl = encodeURIComponent(url);
          const encodedText = encodeURIComponent(text);
          const destinations = {
            X: "https://twitter.com/intent/tweet?url=" + encodedUrl + "&text=" + encodedText,
            Facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodedUrl,
            Telegram: "https://t.me/share/url?url=" + encodedUrl + "&text=" + encodedText,
            Reddit: "https://www.reddit.com/submit?url=" + encodedUrl + "&title=" + encodedText
          };
          const target = destinations[platform];
          if (target) window.open(target, "_blank", "noopener,noreferrer,width=720,height=640");
        });
      }

      const jumpForms = document.querySelectorAll("[data-volume-jump-form]");
      for (const form of jumpForms) {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const input = form.querySelector("input[name='entry']");
          if (!(input instanceof HTMLInputElement)) return;
          const raw = input.value.trim().toLowerCase();
          if (!raw) return;
          const normalized = raw.replace(/^0+/, "") || "0";
          const anchors = document.querySelectorAll("[data-entry-anchor]");
          let target = null;
          for (const anchor of anchors) {
            const entryNo = (anchor.getAttribute("data-entry-no") || "").replace(/^0+/, "") || "0";
            const entryText = (anchor.getAttribute("data-entry-text") || "").toLowerCase();
            if (entryNo === normalized || entryText.includes(raw)) {
              target = anchor;
              break;
            }
          }
          if (target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            history.replaceState(null, "", "#" + (target.id || "volume-directory"));
          }
        });
      }
    })();
  