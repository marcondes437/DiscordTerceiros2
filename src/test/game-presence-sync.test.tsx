import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ActivityPresence, useActivityPresence } from "@/components/activity-presence";
const backend=vi.hoisted(()=>({track:vi.fn(),remove:vi.fn(),unsubscribe:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{
  auth:{getUser:async()=>({data:{user:{id:"self",user_metadata:{display_name:"Ana"},app_metadata:{}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:backend.unsubscribe}}})},
  channel:()=>{
    let sync=()=>{};let state:any={};
    const channel:any={
      on:(_type:string,_filter:unknown,callback:()=>void)=>{sync=callback;return channel;},
      subscribe:(callback:(status:string)=>void)=>{callback("SUBSCRIBED");return channel;},
      presenceState:()=>state,
      track:async(payload:unknown)=>{backend.track(payload);state={self:[payload]};sync();return "ok";},
    };return channel;
  },removeChannel:backend.remove,
}}));
function Probe(){const activity=useActivityPresence();return <><button onClick={()=>activity.startGame("rabisco")}>Jogar</button><button onClick={()=>activity.setCustomGame("FiveM")}>Exibir FiveM</button><button onClick={activity.stopGame}>Parar</button><output>{activity.currentGame?.id||"Sem jogo"}</output></>;}
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();});
afterEach(()=>{cleanup();localStorage.clear();});
it("broadcasts named game activity to the community and clears it when stopped",async()=>{
  const view=render(<ActivityPresence><Probe/></ActivityPresence>);
  await waitFor(()=>expect(backend.track).toHaveBeenCalledWith(expect.objectContaining({id:"self"})));
  fireEvent.click(screen.getByRole("button",{name:"Exibir FiveM"}));
  await waitFor(()=>expect(backend.track).toHaveBeenLastCalledWith(expect.objectContaining({game:"custom",gameName:"FiveM",gameStartedAt:expect.any(Number),gameUntil:expect.any(Number)})));
  expect(JSON.parse(localStorage.getItem("senai-game:self")!)).toMatchObject({id:"custom",name:"FiveM"});
  fireEvent.click(screen.getByRole("button",{name:"Parar"}));
  await waitFor(()=>expect(backend.track).toHaveBeenLastCalledWith(expect.objectContaining({game:null,gameName:null,gameUntil:0})));
  expect(localStorage.getItem("senai-game:self")).toBeNull();
  view.unmount();expect(backend.remove).toHaveBeenCalled();expect(backend.unsubscribe).toHaveBeenCalled();
});
it("keeps the original start time on internal-game heartbeats and synchronizes clearing from another tab",async()=>{
  render(<ActivityPresence><Probe/></ActivityPresence>);
  await waitFor(()=>expect(backend.track).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button",{name:"Jogar"}));
  const first=JSON.parse(localStorage.getItem("senai-game:self")!);
  fireEvent.click(screen.getByRole("button",{name:"Jogar"}));
  expect(JSON.parse(localStorage.getItem("senai-game:self")!).startedAt).toBe(first.startedAt);
  localStorage.removeItem("senai-game:self");
  act(()=>window.dispatchEvent(new StorageEvent("storage",{key:"senai-game:self",newValue:null})));
  await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("Sem jogo"));
  expect(backend.track).toHaveBeenLastCalledWith(expect.objectContaining({game:null}));
});
