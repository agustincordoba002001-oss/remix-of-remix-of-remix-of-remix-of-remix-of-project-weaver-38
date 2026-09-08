import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { TOTAL } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={TOTAL}
    fps={30}
    width={1920}
    height={1080}
  />
);
