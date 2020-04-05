import { Note } from "tonal";
import { Transport, Synth, PolySynth, Midi, Time, Sampler } from "tone";
import WebMidi, { Input, Output, InputEventNoteon } from "webmidi";
import { synth } from './sequencer';

// import WebMidi, { InputEventNoteon, InputEventNoteoff } from "webmidi";

// import { SVG } from "@svgdotjs/svg.js";

Transport.bpm.value = 120;

// let synth = new PolySynth(6, Synth, {
//   oscillator : {
// 		type : "square"
// 	}
// }).toMaster();

let noteFiles: any = {}; 
let noteNames = ['A', 'Ab', 'B', 'Bb', 'C', 'D', 'Db', 'E', 'Eb', 'F', 'G', 'Gb']
for(let noteName of noteNames) {
  let startIndex = noteName == 'A' || noteName == 'B' || noteName == 'Bb' ? 0 : 1;
  for(let i=startIndex ; i<8 ; i++) {
    noteFiles[noteName + i] = noteName + i + '.mp3'
  }
}

// let synth = new Sampler(noteFiles, {
//   "release" : 1,
//   "baseUrl" : "/midi-js-soundfonts/FatBoy/bassoon-mp3/"
// }).toMaster();

declare var SVG: any;
let notes: Map<number, Map<number, any>> = new Map();

let io: { input: Input; output: Output } = {
  input: null as any,
  output: null as any
};

function initializeInput(ioName: "input" | "output") {
  if (ioName === "input") {
    (io[ioName] as Input).addListener(
      "noteon",
      "all",
      (event: InputEventNoteon) => {
        let noteNumber = event.note.number;
        let noteTime = Math.floor(4 * (Transport.seconds * Transport.bpm.value / 60));
        toggleNote(noteNumber, noteTime);
      }
    );
  }
};

function rowNumberToMidiNote(rowNumber: number) {
  return nNotes - (rowNumber + 1) + 21;
}

function midiNoteToRowNumber(midiNote: number) {
  return -(midiNote - nNotes - 21) - 1;
}

function setNote(noteNumber: number, noteTime: number) {
  let noteYOnTrack = midiNoteToRowNumber(noteNumber);
  let noteX = trackMargin + (noteTime + 1) * (noteWidth + noteMargin);
  let noteY = trackMargin + noteYOnTrack * (noteHeight + noteMargin);
  let noteRectangle = draw
  .rect(noteWidth + noteMargin, noteHeight + noteMargin)
  .move(noteX, noteY)
  .fill("rgba(140, 190, 239, 0.8)");

  let eventId = Transport.schedule(function(time: any) {
    synth.triggerAttackRelease(Midi(noteNumber).toFrequency(), "16n", time);
    io.output?.playNote(noteNumber, "all", time);
  }, '0:0:' + noteTime);

  let notesAtTime = notes.get(noteTime);

  if (!notesAtTime) {
    notesAtTime = new Map();
    notes.set(noteTime, notesAtTime);
  }
  notesAtTime.set(noteNumber, { eventId: eventId, noteRectangle: noteRectangle });
}

function clearNote(
  noteNumber: number,
  noteTime: number,
  noteEventAndRectangle: any,
  notesAtTime: Map<number, number>
) {
  Transport.clear(noteEventAndRectangle.eventId);
  noteEventAndRectangle.noteRectangle.remove();
  notesAtTime.delete(noteNumber);
  if (notesAtTime.size === 0) {
    notes.delete(noteTime);
  }
}

function toggleNote(noteNumber: number, noteTime: number) {
  

  let notesAtTime = notes.get(noteTime);
  if (notesAtTime) {
    let noteEventAndRectangle = notesAtTime.get(noteNumber);
    if (noteEventAndRectangle) {
      if(addingNotes == null || !addingNotes) {
        clearNote(noteNumber, noteTime, noteEventAndRectangle, notesAtTime);
        addingNotes = false;
      }
      return;
    }
  }

  if(addingNotes == null || addingNotes) {
    addingNotes = true;
    setNote(noteNumber, noteTime);
  }
}

let initializeMidiIO = function(
  ioName: "input" | "output",
  midiPorts: (Input | Output)[]
) {
  
  if(midiPorts.length == 0) {
    return;
  }

  // Initialize inputs
  let ioSelect: HTMLSelectElement = document.getElementById(
    "midi-" + ioName
  ) as HTMLSelectElement;

  // Empty inputSelect
  while (ioSelect.firstChild) {
    ioSelect.firstChild.remove();
  }

  // Add all input options to the select
  for (let io of midiPorts) {
    let option = document.createElement("option");
    option.textContent = io.name;
    option.setAttribute("value", io.name);
    ioSelect.append(option);
  }

  // On change event: set input to the proper midi input
  ioSelect.addEventListener("change", function(event) {
    io[ioName] = ioName == 'input' ? WebMidi.getInputByName(ioSelect.value) as any : WebMidi.getOutputByName(ioSelect.value) as any;
    initializeInput(ioName);
  });

  io[ioName] = midiPorts[0] as any;
  initializeInput(ioName);
  ioSelect.value = io[ioName].name;
};

let refreshMidiIO = function() {
  initializeMidiIO("input", WebMidi.inputs);
  initializeMidiIO("output", WebMidi.outputs);
};

let refreshButton = document.getElementById(
  "refresh-midi"
) as HTMLButtonElement;
refreshButton.addEventListener("click", refreshMidiIO);

WebMidi.enable(function(err) {
  if (err) {
    console.log("WebMidi could not be enabled.", err);
  }

  // Viewing available inputs and outputs
  console.log(WebMidi.inputs);
  console.log(WebMidi.outputs);

  // Display the current time
  console.log(WebMidi.time);

  refreshMidiIO();
});

let noteWidth = 20;
let noteHeight = 10;
let noteMargin = 2;

let nNotes = 88;
let trackLength = 16;

let trackMargin = 25;
let trackWidth = (trackLength + 1) * (noteWidth + noteMargin);
let trackHeight = nNotes * (noteHeight + noteMargin);

var draw = SVG()
  .size(trackWidth + 2 * trackMargin, trackHeight + 2 * trackMargin)
  .addTo("#sequencer");

let lineColor = "#999";
let playHead: any = null;

let dragging = false;
let addingNotes: boolean | null = null;

let sequencerLenghtInput = document.getElementById('sample-length') as HTMLInputElement;
sequencerLenghtInput.value = '' + trackLength;
sequencerLenghtInput.addEventListener('change', function(event: Event) {
  trackLength = parseInt(sequencerLenghtInput.value);
  Transport.loopEnd = Time('0:0:' + trackLength);

  draw.clear();
  generateTrack();

  let notesToRecreate: { noteNumber: number, noteTime: number }[] = [];
  for(const [noteTime, notesAtTime] of notes.entries()) {
    for(const [noteNumber, noteEventAndRectangle] of notesAtTime.entries()) {
      clearNote(noteNumber, noteTime, noteEventAndRectangle, notesAtTime);
      if(noteTime < trackLength) {
        notesToRecreate.push({noteNumber: noteNumber, noteTime: noteTime});
      }
    }
  }
  for(let note of notesToRecreate) {
    setNote(note.noteNumber, note.noteTime);
  }
});

let noteFromPosition = (event: MouseEvent)=> {

  let sequencerContainer = document.getElementById(
    "sequencer"
  ) as HTMLElement;

  console.log(sequencerContainer.scrollLeft, sequencerContainer.scrollTop);
  let sequencerRectangle = sequencerContainer.getBoundingClientRect();
  let positionOnTrack = {
    x:
      event.pageX -
      sequencerRectangle.left -
      trackMargin -
      noteWidth -
      noteMargin +
      sequencerContainer.scrollLeft,
    y:
      event.pageY -
      sequencerRectangle.top -
      trackMargin +
      sequencerContainer.scrollTop
  };
  //console.log(positionOnTrack);
  let noteTime = Math.floor(positionOnTrack.x / (noteWidth + noteMargin));
  let noteYOnTrack = Math.floor(
    positionOnTrack.y / (noteHeight + noteMargin)
  );
  let noteNumber = rowNumberToMidiNote(noteYOnTrack);

  return [noteTime, noteNumber];
}

let generateTrack = () => {
  trackWidth = (trackLength + 1) * (noteWidth + noteMargin);
  trackHeight = nNotes * (noteHeight + noteMargin);

  for (let y = 0; y <= nNotes; y++) {
    let lineY = trackMargin + y * (noteHeight + noteMargin);
    draw
      .line(trackMargin, lineY, trackMargin + trackWidth, lineY)
      .stroke({ width: noteMargin, color: lineColor });
  }

  for (let y = 0; y < nNotes; y++) {
    let textY = trackMargin + y * (noteHeight + noteMargin) - 2;
    let text = Note.fromMidi(rowNumberToMidiNote(y));
    let noteText = draw.text(text).attr({ x: trackMargin + 2, y: textY });
    noteText.font({ family: "Helvetica", size: 9 });
  }

  for (let x = 0; x <= trackLength + 1; x++) {
    let lineX = trackMargin + x * (noteWidth + noteMargin);
    draw
      .line(lineX, trackMargin, lineX, trackMargin + trackHeight)
      .stroke({ width: noteMargin, color: lineColor });
  }

  playHead = draw
    .rect(noteWidth + noteMargin, nNotes * (noteHeight + noteMargin))
    .move(trackMargin + noteWidth + noteMargin, trackMargin)
    .fill("rgba(30, 40, 180, 0.2)");

  let background = draw
    .rect(trackWidth, trackHeight)
    .move(trackMargin, trackMargin)
    .fill("rgba(255,255,255,0)")
    .attr({ cursor: "pointer" });
};

generateTrack();

draw.mousedown(function(event: MouseEvent) {
  dragging = true;
  let [noteTime, noteNumber] = noteFromPosition(event);
  addingNotes = null;
  toggleNote(noteNumber, noteTime);
});

draw.mousemove(function(event: MouseEvent) {
  if(dragging) {
    let [noteTime, noteNumber] = noteFromPosition(event);
    toggleNote(noteNumber, noteTime);
  }
});

draw.mouseup(function(event: MouseEvent) {
  dragging = false;
});

let movePlayHead = function(time: number=0) {
  let beatNumber = Math.floor(4 * (Transport.seconds * Transport.bpm.value / 60));
  playHead.move(
    trackMargin + noteWidth + noteMargin + beatNumber * (noteWidth + noteMargin)
  );
};

Transport.loop = true;
Transport.loopStart = Time(0);
Transport.loopEnd = Time('0:0:' + trackLength);

Transport.scheduleRepeat(movePlayHead, "16n");

let playButton = document.getElementById("play") as HTMLButtonElement;
playButton.addEventListener("click", (event: MouseEvent) => {
  if(Transport.state === "started") {
    Transport.pause();
    playButton.textContent = "Play";
  } else {
    Transport.start();
    playButton.textContent = "Pause";
  }
});

let stopButton = document.getElementById("stop") as HTMLButtonElement;
stopButton.addEventListener("click", (event: MouseEvent) => {
  Transport.stop();
  movePlayHead();
  playButton.textContent = "Play";
});

/*
let animation = () => {
  window.requestAnimationFrame(animation);
};

window.requestAnimationFrame(animation);
*/
