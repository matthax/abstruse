import { Component, ElementRef, OnInit, Input, SimpleChange, EventEmitter } from '@angular/core';
import * as AnsiUp from 'ansi_up';

@Component({
  selector: 'app-terminal',
  templateUrl: 'app-terminal.component.html'
})
export class AppTerminalComponent implements OnInit {
  @Input() data: any;
  @Input() options: { size: 'normal' | 'large' };
  au: any;
  commands: { command: string, visible: boolean, output: string, time: string }[];
  noData: boolean;

  constructor(private elementRef: ElementRef) {
    this.commands = [];
  }

  ngOnInit() {
    this.au = new AnsiUp.default();
    this.au.use_classes = true;
    this.commands = [];
    this.noData = true;
  }

  ngOnChanges(changes: SimpleChange) {
    if (!this.data) {
      return;
    }

    this.noData = false;

    if (typeof this.data.clear !== 'undefined') {
      this.commands = [];
    } else {
      const output: string = this.au.ansi_to_html(this.data);
      const regex = /==[&gt;|>](.*)/g;
      let match;
      let commands: string[] = [];

      if (output.match(regex)) {
        while (match = regex.exec(output)) {
          commands.push(match[0]);
        }

        if (commands.length > 1) {
          this.commands = [];
        }

        let retime = new RegExp('exectime.*(\\d)', 'igm');
        let times = [];
        while (match = retime.exec(output)) {
          let t = match[0].replace('exectime]: ', '').replace(/<span.*/, '');
          times.push(t);
        }

        this.commands = commands.reduce((acc, curr, i) => {
          let next = commands[i + 1] || '';
          next = next.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
          const c = curr.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
          let re = new RegExp('(' + c + ')(' + '[\\s\\S]+' + ')(' + next + ')');
          if (!output.match(re)) {
            re = new RegExp('(' + c + ')' + '[\\s\\S]+');
          }
          let retime = new RegExp('exectime.*(\\d)', 'igm');
          let t = times[i] ? parseFloat(<any>(times[i] / 10)).toFixed(0) : null;
          let time = t && parseInt(<any>t, 10);

          return acc.concat({
            command: curr.trim(),
            visible: i === commands.length - 1 ? true : false,
            output: output.match(re) && output.match(re)[2] ? output.match(re)[2].trim() : '',
            time: times[i] ? this.getDuration(time) : null
          });
        }, this.commands);
      } else {
        if (output.includes('[exectime]')) {
          const time = parseInt(output.replace('[exectime]', ''), 10);
          console.log(time);
        } else {
          this.commands[this.commands.length - 1].output += output;
        }
      }

      this.commands = this.commands.map((cmd, i) => {
        cmd.visible = i === this.commands.length - 1 ? true : false;
        return cmd;
      });
    }

    this.checkScrollBottom();
  }

  checkScrollBottom(): void {
    // TODO: make this work actually
    // const element = window.document.documentElement;
    // if (element.scrollTop + element.clientHeight == element.scrollHeight) {
      window.scrollTo(0, document.body.scrollHeight);
    // }
  }

  toogleCommand(index: number) {
    this.commands[index].visible = !this.commands[index].visible;
  }

  getDuration(millis: number): string {
    const dur = {};
    const units = [
      {label: 'millis', mod: 100 }, // millis
      {label: 'seconds', mod: 60 },
      {label: 'minutes', mod: 60 },
      {label: 'hours', mod: 24 },
      {label: 'days', mod: 31 }
    ];
    units.forEach(u => millis = (millis - (dur[u.label] = (millis % u.mod))) / u.mod);
    const nonZero = (u) => { return dur[u.label]; };
    dur.toString = () => {
      return units
        .reverse()
        .filter(nonZero)
        .map(u => dur[u.label] + ' ' + (dur[u.label] === 1 ? u.label.slice(0, -1) : u.label))
        .join(', ');
    };

    return dur.toString();
  }
}
