document.addEventListener("DOMContentLoaded", () => {
  const template = document.getElementById("guideSectionsTemplate");
  const homeGuideContent = document.getElementById("homeGuideContent");
  const helpGuideContent = document.getElementById("helpGuideContent");

  if (!template) {
    return;
  }

  const populateGuide = (target) => {
    if (!target) {
      return;
    }

    const content = template.content.cloneNode(true);
    target.replaceChildren(content);
  };

  populateGuide(homeGuideContent);
  populateGuide(helpGuideContent);
});
