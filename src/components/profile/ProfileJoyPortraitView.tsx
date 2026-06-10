import type { ReactNode } from "react";

import type { ProfilePortraitData } from "@/lib/profile-portrait-data";
import type { UserColorProfile } from "@/lib/user-color-profile";

import { JoyAura } from "@/components/profile/JoyAura";

type ProfileJoyPortraitViewProps = {
  data: ProfilePortraitData;
  colorProfile: UserColorProfile | null;
  submissionCount: number;
};

const sectionLabelClass =
  "m-0 w-full font-sans text-[16px] font-medium uppercase leading-[1.2] tracking-normal text-[#897c70]";

const sectionBodyClass =
  "m-0 w-full font-sans text-[24px] font-normal leading-[1.2] text-black";

function PortraitSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-2 text-left">
      <p className={sectionLabelClass}>{label}</p>
      {children}
    </div>
  );
}

export function ProfileJoyPortraitView({
  data,
  colorProfile,
  submissionCount,
}: ProfileJoyPortraitViewProps) {
  const { joyAuraSentence, whatDrawsYouIn, wordsOfJoy } = data;

  return (
    <div className="mx-auto flex w-full max-w-[1116px] justify-center">
      <div className="flex w-full max-w-[1116px] flex-row-reverse flex-wrap items-start justify-center gap-[100px]">
        <div className="flex w-full min-w-0 max-w-[507.5px] flex-1 flex-col items-start gap-[72px] max-[900px]:max-w-full">
          <PortraitSection label="Your joy aura">
            {joyAuraSentence ? (
              <p className={sectionBodyClass}>{joyAuraSentence}</p>
            ) : (
              <p className="m-0 w-full font-sans text-[24px] font-normal leading-[1.2] text-[#8C7B6E]">
                Share a few joy spots to see your aura here.
              </p>
            )}
          </PortraitSection>

          <PortraitSection label="What draws you in">
            {whatDrawsYouIn ? (
              <p className={sectionBodyClass}>{whatDrawsYouIn}</p>
            ) : (
              <p className="m-0 w-full font-sans text-[24px] font-normal leading-[1.2] text-[#8C7B6E]">
                Subjects from your spots—like nature or people—will show up
                here.
              </p>
            )}
          </PortraitSection>

          <PortraitSection label="Words of joy">
            {wordsOfJoy.length > 0 ? (
              <div className="flex flex-wrap justify-start gap-4">
                {wordsOfJoy.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center justify-center rounded-[41px] bg-[#897c70] px-[25px] py-[10px] font-sans text-[18px] font-medium leading-[1.2] text-white"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="m-0 w-full font-sans text-[24px] font-normal leading-[1.2] text-[#8C7B6E]">
                Your most-used joy-spot tags will gather here.
              </p>
            )}
          </PortraitSection>
        </div>

        <div className="flex w-full min-w-0 max-w-[507.5px] flex-1 flex-col items-start gap-[72px] max-[900px]:max-w-full">
          <div className="flex w-full flex-col items-start gap-[12px] text-left">
            <p className={sectionLabelClass}>The colors of your joy</p>
            <JoyAura
              colorProfile={colorProfile}
              submissionCount={submissionCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
