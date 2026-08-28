import type { Dictionary } from "@/i18n/dictionaries/ja";

export function getCreatorPipeline(dict: Dictionary) {
  return [
    {
      step: "01",
      icon: "brush",
      title: dict.studio.brandPortrait,
      desc: dict.studio.brandPortraitDesc,
    },
    {
      step: "02",
      icon: "verified",
      title: dict.studio.brandOfficial,
      desc: dict.studio.brandOfficialDesc,
    },
    {
      step: "03",
      icon: "dynamic_feed",
      title: dict.studio.brandSns,
      desc: dict.studio.brandSnsDesc,
    },
    {
      step: "04",
      icon: "favorite",
      title: dict.studio.brandOshi,
      desc: dict.studio.brandOshiDesc,
    },
  ] as const;
}

export function getCreatorValueProps(dict: Dictionary) {
  return [
    { icon: "payments", label: dict.studio.brandMrr, desc: dict.studio.brandMrrDesc },
    { icon: "psychology", label: dict.studio.brandMemory, desc: dict.studio.brandMemoryDesc },
    { icon: "auto_awesome", label: dict.studio.brandSkills, desc: dict.studio.brandSkillsDesc },
    { icon: "lock_open", label: dict.studio.brandPrivate, desc: dict.studio.brandPrivateDesc },
  ] as const;
}
