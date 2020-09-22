import * as Tone from "tone";

import "./styles.css";

const masterGain = new Tone.Gain(0).toDestination();
Tone.Transport.bpm.value = 70;

// hi synth
const initHiSynth = async () => {
  const getNote = () => {
    const notes = ["A3", "B3", "C4", "D4", "E4", "G4", "A4"];
    return notes[(notes.length * Math.random()) | 0];
  };

  const hiSynth = new Tone.Synth({
    oscillator: {
      type: "sine8",
    },
    envelope: {
      attack: 1,
      release: 1,
    },
  });
  const hiFilter = new Tone.Filter(200, "lowpass");
  const hiFilterLfo = new Tone.LFO({
    type: "sine",
    min: 100,
    max: 600,
  });
  const hiLfoLfo = new Tone.LFO({
    type: "sine",
    frequency: 0.1,
    min: 1,
    max: 5,
  });
  hiLfoLfo.connect(hiFilterLfo.frequency);
  hiFilterLfo.connect(hiFilter.frequency);
  hiFilterLfo.start();
  const hiFeedbackDelay = new Tone.FeedbackDelay(0.2, 0.75);
  const hiVerb = new Tone.Reverb({
    decay: 30,
    wet: 0.8,
  });

  const hiVol = new Tone.Volume(-12);
  const hiPanner = new Tone.AutoPanner(0.02);

  await hiVerb.generate();

  hiSynth.connect(hiFilter);
  hiFilter.connect(hiFeedbackDelay);
  hiFeedbackDelay.connect(hiVerb);
  hiVerb.connect(hiVol);
  hiVol.connect(hiPanner);
  hiPanner.connect(masterGain);

  hiPanner.start();

  new Tone.Loop((time) => {
    if (Math.random() < 0.6) {
      hiSynth.triggerAttackRelease(getNote(), 0.75, time);
    }
  }, "1n").start(0);

  Tone.Transport.start();
};

// lo synth
const initLoSynth = async () => {
  const loSynth = new Tone.Oscillator({
    frequency: 65,
    type: "sawtooth",
  });
  const loFilter = new Tone.Filter({
    type: "lowpass",
  });
  const loFilterLfo = new Tone.LFO({
    type: "sine",
    frequency: 0.05,
    min: 50,
    max: 300,
  });

  const loVerb = new Tone.Reverb({
    decay: 10,
    wet: 0.25,
  });
  await loVerb.generate();

  const loVol = new Tone.Volume(-24);

  loFilterLfo.connect(loFilter.frequency);
  loFilterLfo.start();

  loSynth.connect(loFilter).start();
  loFilter.connect(loVerb);
  loVerb.connect(loVol);
  loVol.connect(masterGain);
};

// noise
const initNoise = () => {
  const noise = new Tone.Noise("pink").start();
  const noiseFilter = new Tone.Filter({
    type: "highpass",
  });
  const noiseLfo = new Tone.LFO({
    type: "sine",
    frequency: 0.01,
    min: 5000,
    max: 9000,
  });
  noiseLfo.start();

  const noiseDelay = new Tone.FeedbackDelay(0.2, 0.75);
  const noiseVol = new Tone.Volume(-40);
  const noisePanner = new Tone.AutoPanner(0.05).start();

  noiseLfo.connect(noiseFilter.frequency);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseDelay);
  noiseDelay.connect(noiseVol);
  noiseVol.connect(noisePanner);
  noisePanner.connect(masterGain);
};

enum Drumkit {
  Kick1 = "kick-1",
  Kick2 = "kick-2",
  Snare = "snare",
  Hat1 = "hat-1",
  Hat2 = "hat-2",
};

namespace Drumkit {
  export function pathToSample(drumkit: Drumkit, drumkitName: string) {
    return `/samples/drumkit/${drumkitName}/${drumkit}.wav`;
  }

  export function createPlayersMap(drumkitName: string) {
    const drums = Object.keys(Drumkit).map(k => Drumkit[k])
    var players = {};
    drums.forEach((drum) => {
      const path = Drumkit.pathToSample(drum, drumkitName);
      players[drum] = new Tone.Player(path).toDestination();
    });
    return players;
  }
}

const createSolarisDrumkit = () => {
  return Drumkit.createPlayersMap("solaris");
}

// interaction
const button = document.querySelector(".button");

button.addEventListener("click", async () => {
  button.classList.add("button__hidden");
  document
    .querySelectorAll(".gradient")
    .forEach((div) => div.classList.add("gradient--animating"));

  Tone.start();

  initNoise();
  initHiSynth();
  initLoSynth();

  const solaris = createSolarisDrumkit();

  // this seems to be taking a while to load the drumkit (>3s in Firefox on my laptop)
  // should figure out why (the wav files aren't that big)
  await Tone.loaded();

  Tone.Transport.bpm.value = 120;

  Tone.Transport.scheduleRepeat((time) => {
    solaris[Drumkit.Kick1].start(time);
  }, "4n");

  // this modular arithmetic is my implementation of a basic step sequencer.
  // would be cool to come up with lots of different patterns and transition between them?
  var numEighthNotes = 0;
  Tone.Transport.scheduleRepeat((time) => {
    const eightNoteIndexInTwoBars = numEighthNotes % 16;
    if ([2, 11, 14].includes(eightNoteIndexInTwoBars)) {
      solaris[Drumkit.Snare].start(time);
    }
    numEighthNotes += 1;
  }, "8n");
  // transport must be started before it starts invoking events
  Tone.Transport.start();

  masterGain.gain.rampTo(1, 10);
});
