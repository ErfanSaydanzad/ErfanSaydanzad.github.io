/* The site works with this file blocked. Everything below is an improvement to
   something that already functions, which is the only kind of script a page
   like this should carry. */

(function () {
  "use strict";

  /* Anchor links on headings.
     Someone reading a research page wants to send a colleague the paragraph,
     not the page. The heading already has an id -- the builder puts one on
     every heading -- so all that is missing is a way to get at it. Added in
     JavaScript rather than in the markup because a permalink is useless
     without a clipboard, and a reader with no scripts should not be shown a
     control that does nothing. */
  var headings = document.querySelectorAll(
    ".prose h2[id], .prose h3[id], .cv-section h2[id]"
  );

  headings.forEach(function (heading) {
    var link = document.createElement("a");
    link.className = "heading-anchor";
    link.href = "#" + heading.id;
    link.setAttribute("aria-label", "Link to this section");
    link.textContent = "#";
    heading.appendChild(link);
  });

  /* Mark the external links that carry a reader off the site.
     The stylesheet gives .ext nothing by default; this is here so a future
     decision to mark them can be made in CSS alone. */
  var here = window.location.host;
  document.querySelectorAll('a[href^="http"]').forEach(function (a) {
    if (a.host && a.host !== here) {
      a.classList.add("ext");
    }
  });
})();
