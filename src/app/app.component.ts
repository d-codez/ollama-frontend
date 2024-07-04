import { NgClass, NgFor, NgIf } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MarkdownModule } from 'ngx-markdown';
import { Subscription } from 'rxjs';
import { WSResponse } from './core/model/app.model';
import { WebSocketService } from './core/services/websocket.service';

interface ChatMessage {
  text: string;
  isUser: boolean;
  isPartial?: boolean;
  isTypingLoader?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    FormsModule,
    NgFor,
    NgClass,
    NgIf,
    RouterModule,
    MarkdownModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('inputTextarea') private inputTextarea!: ElementRef;

  messages: ChatMessage[] = [];
  inputMessage: string = '';
  currentMessageIndex: number | null = null;
  isScrolledUp: boolean = false;
  isReceiving: boolean = false;
  socketSubscription: Subscription | null = null;
  reconnectDelay: number = 10000; // 10 seconds delay

  constructor(private wsService: WebSocketService) {}

  ngOnInit() {
    this.connectWebSocket();
  }

  connectWebSocket() {
    const socket$ = this.wsService.connect();
    this.socketSubscription = socket$.subscribe({
      next: (data: WSResponse) => {
        this.removeTypingLoader();

        if (data.done) {
          this.finalizeCurrentMessage();
        } else {
          this.processPartialResponse(data);
        }

        this.scrollToBottom();
      },
      error: (err) => {
        console.error(err);
        this.handleWebSocketError();
      },
      complete: () => {
        console.log('WebSocket connection complete');
        this.handleWebSocketComplete();
      },
    });
  }

  processPartialResponse(data: WSResponse) {
    if (!data.response) return;

    if (this.currentMessageIndex === null) {
      this.addPartialResponseMessage(data.response);
    } else {
      this.appendToCurrentMessage(data.response);
    }
  }

  addPartialResponseMessage(response: string) {
    this.messages.push({
      text: response ?? '',
      isUser: false,
      isPartial: true,
      isTypingLoader: false,
    });
    this.currentMessageIndex = this.messages.length - 1;
  }

  appendToCurrentMessage(response: string | null) {
    if (this.currentMessageIndex !== null) {
      this.messages[this.currentMessageIndex].text += response ?? '';
    }
  }

  finalizeCurrentMessage() {
    if (this.currentMessageIndex !== null) {
      this.messages[this.currentMessageIndex].isPartial = false;
      this.currentMessageIndex = null;
    }
    this.isReceiving = false;
    this.inputTextarea.nativeElement.focus();
  }

  handleWebSocketError() {
    this.isReceiving = false;
    setTimeout(() => this.reconnectWebSocket(), this.reconnectDelay);
  }

  handleWebSocketComplete() {
    this.isReceiving = false;
    setTimeout(() => this.reconnectWebSocket(), this.reconnectDelay);
  }

  reconnectWebSocket() {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    this.connectWebSocket();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  sendMessage() {
    if (this.isReceiving) return;

    const userMessage = this.inputMessage.trim();
    if (userMessage) {
      this.addUserMessage(userMessage);
      this.sendRequestToWebSocket(userMessage);
      this.addTypingLoader();
      this.inputMessage = ''; // Clear input after sending
    }

    this.resetTextareaHeight();
  }

  addUserMessage(userMessage: string) {
    this.messages.push({ text: userMessage, isUser: true });
  }

  sendRequestToWebSocket(userMessage: string) {
    const request = {
      model: 'gemma:2b',
      prompt: userMessage,
    };

    this.wsService.sendMessage(request);
    this.isReceiving = true;
    this.adjustTextareaHeight();
  }

  addTypingLoader() {
    this.messages.push({
      text: '',
      isUser: false,
      isTypingLoader: true,
    });
  }

  removeTypingLoader() {
    const loaderIndex = this.messages.findIndex(
      (message) => message.isTypingLoader
    );
    if (loaderIndex > -1) {
      this.messages.splice(loaderIndex, 1);
    }
  }

  stopResponse() {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
      this.isReceiving = false;
      this.removeTypingLoader();
      setTimeout(() => this.reconnectWebSocket(), this.reconnectDelay); // Reconnect after stopping the current stream
    }
  }

  private scrollToBottom() {
    if (this.chatContainer && !this.isScrolledUp) {
      this.chatContainer.nativeElement.scrollTop =
        this.chatContainer.nativeElement.scrollHeight;
    }
  }

  adjustTextareaHeight(event?: Event) {
    const textarea = event ? (event.target as HTMLTextAreaElement) : null;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    } else {
      const textareaElement = this.inputTextarea.nativeElement;
      if (textareaElement) {
        textareaElement.style.height = 'auto';
        textareaElement.style.height = `${textareaElement.scrollHeight}px`;
      }
    }
  }

  private resetTextareaHeight() {
    const textareaElement = this.inputTextarea.nativeElement;
    if (textareaElement) {
      textareaElement.style.height = 'auto';
      textareaElement.rows = 1;
    }
  }

  ngOnDestroy() {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
  }
}
