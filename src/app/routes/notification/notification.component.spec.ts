import { NotificationsComponent } from './notification.component'
import { of } from 'rxjs'
import { Events } from './events'
import { LocalStorageService } from '../../services/local-storage.service'
import { ConfigurationsService, ValueService } from '@ws-widget/utils'
import { MatDialogRef } from '@angular/material/dialog'
import { Router } from '@angular/router'
import { Renderer2, ChangeDetectorRef } from '@angular/core'
import { Socket, io } from 'socket.io-client'

jest.mock('socket.io-client')

describe('NotificationsComponent', () => {
  let component: NotificationsComponent
  let eventsMock: Partial<Events>
  let storageMock: Partial<LocalStorageService>
  let configSvcMock: Partial<ConfigurationsService>
  let valueSvcMock: Partial<ValueService>
  let dialogRefMock: Partial<MatDialogRef<NotificationsComponent>>
  let routerMock: Partial<Router>
  let rendererMock: Partial<Renderer2>
  let cdrMock: Partial<ChangeDetectorRef>
  let socketMock: Partial<Socket>

  beforeEach(() => {
    eventsMock = { publish: jest.fn() }
    storageMock = {
      setLocalStorage: jest.fn(),
      getLocalStorage: jest.fn().mockResolvedValue({ notifications: [], userId: 'user123' }),
      setNumberOfNotifications: jest.fn()
    }
    configSvcMock = { userProfile: { userId: 'user123' } }
    valueSvcMock = { isXSmall$: of(false) }
    dialogRefMock = { close: jest.fn() }
    routerMock = { navigate: jest.fn() }
    rendererMock = { listen: jest.fn() }
    cdrMock = { detectChanges: jest.fn() }
    socketMock = {
      emit: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
      connected: true
    };

    (io as jest.Mock).mockReturnValue(socketMock)

    component = new NotificationsComponent(
      eventsMock as Events,
      storageMock as LocalStorageService,
      routerMock as Router,
      rendererMock as Renderer2,
      configSvcMock as ConfigurationsService,
      valueSvcMock as ValueService,
      dialogRefMock as MatDialogRef<NotificationsComponent>,
      cdrMock as ChangeDetectorRef
    )

    component.socket = socketMock as Socket
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should initialize component', async () => {
    const getAccessTokenSpy = jest.spyOn(component, 'getAccessToken').mockResolvedValue('token')
    const getReadNotificationsSpy = jest.spyOn(component, 'getReadNotifications')
    const connectSocketSpy = jest.spyOn(component, 'connectSocket')
    const getNotificationSpy = jest.spyOn(component, 'getNotification')

    await component.ngOnInit()

    expect(getAccessTokenSpy).toHaveBeenCalled()
    expect(getReadNotificationsSpy).toHaveBeenCalled()
    expect(connectSocketSpy).toHaveBeenCalled()
    expect(getNotificationSpy).toHaveBeenCalled()
  })

  it('should toggle dropdown content', () => {
    component.dropdownContent = false
    component.openDailog()
    expect(component.dropdownContent).toBe(true)
  })

  it('should handle "read" action', () => {
    component.unReadNotificationList = [{ id: 1, status: 'unread' }]
    component.readNotificationList = []
    component.user_id = 'user123'

    component.handleAction('read')

    expect(socketMock.emit).toHaveBeenCalledWith('markAllAsRead', { userId: 'user123' })
    expect(component.unReadNotificationList.length).toBe(0)
    expect(component.readNotificationList.length).toBe(1)
    expect(storageMock.setLocalStorage).toHaveBeenCalled()
    expect(storageMock.setNumberOfNotifications).toHaveBeenCalledWith(0)
    expect(eventsMock.publish).toHaveBeenCalledWith('notificationCountUpdated', 0)
  })

  it('should handle "clear" action', () => {
    component.readNotificationList = [{ id: 1, status: 'read' }]
    component.unReadNotificationList = [{ id: 2, status: 'unread' }]

    component.handleAction('clear')

    expect(component.readNotificationList.length).toBe(0)
    expect(component.unReadNotificationList.length).toBe(0)
    expect(storageMock.setLocalStorage).toHaveBeenCalled()
    expect(storageMock.setNumberOfNotifications).toHaveBeenCalledWith(0)
    expect(eventsMock.publish).toHaveBeenCalledWith('notificationCountUpdated', 0)
  })

  it('should get access token', async () => {
    localStorage.setItem('loginDetailsWithToken', JSON.stringify({ token: { access_token: 'token' } }))
    const token = await component.getAccessToken()
    expect(token).toBe('token')
  })

  it('should connect to socket', async () => {
    const tokenSpy = jest.spyOn(component, 'getAccessToken').mockResolvedValue('token')
    await component.connectSocket()
    expect(io).toHaveBeenCalled()
    expect(socketMock.on).toHaveBeenCalled()
    expect(tokenSpy).toHaveBeenCalled()
  })

  it('should read notification', async () => {
    const item = { id: 1, status: 'unread', data: { actionData: { actionType: 'course', identifier: 'id' } } }
    const connectSocketSpy = jest.spyOn(component, 'connectSocket')
    const notificationActionSpy = jest.spyOn(component, 'notificationAction').mockResolvedValue()

    await component.readNotification(item)

    expect(connectSocketSpy).toHaveBeenCalled()
    expect(socketMock.emit).toHaveBeenCalledWith('markAsRead', { notificationId: item.id, userId: component.user_id })
    expect(storageMock.setNumberOfNotifications).toHaveBeenCalled()
    expect(eventsMock.publish).toHaveBeenCalled()
    expect(storageMock.setLocalStorage).toHaveBeenCalled()
    expect(notificationActionSpy).toHaveBeenCalledWith(item)
  })

  it('should delete notification', async () => {
    const item = { id: 1, status: 'read' }
    component.readNotificationList = [item]
    component.unReadNotificationList = []

    await component.deleteNotification(item)

    expect(component.readNotificationList.length).toBe(0)
    expect(storageMock.setLocalStorage).toHaveBeenCalled()
    expect(eventsMock.publish).not.toHaveBeenCalled()
  })

  it('should set all notification list', () => {
    component.readNotificationList = [{ id: 1, createdon: '2025-02-24T15:30:00Z' }]
    component.unReadNotificationList = [{ id: 2, createdon: '2025-02-23T08:45:00Z' }]

    component.setAllNotificationList()

    expect(component.allnotificationList.length).toBe(2)
    expect(component.allnotificationList[0].id).toBe(1)
  })

  it('should close dialog', () => {
    component.dropdownContent = true
    component.closeDailog()
    expect(component.dropdownContent).toBe(false)
  })

  it('should get notification time', () => {
    const createdOn = new Date().toISOString()
    const time = component.getNotificationTime(createdOn)
    expect(time).toBe('0mins')
  })

  it('should handle notification action', async () => {
    const item = { data: { actionData: { actionType: 'course', identifier: 'id' } } }
    await component.notificationAction(item)
    expect(routerMock.navigate).toHaveBeenCalledWith(['/app/toc/id/overview'], { replaceUrl: true })
    expect(dialogRefMock.close).toHaveBeenCalled()
  })

  it('should handle touch events', () => {
    const element = { style: { transform: '' } } as HTMLElement
    const touchStartEvent = { touches: [{ clientX: 100 }] } as unknown as TouchEvent
    const touchMoveEvent = { touches: [{ clientX: 50 }] } as unknown as TouchEvent
    const touchEndEvent = {} as TouchEvent

    component.onTouchStart(touchStartEvent, element)
    expect(component.startX).toBe(100)

    component.onTouchMove(touchMoveEvent, element)
    expect(element.style.transform).toBe('translateX(-50px)')

    component.onTouchEnd(touchEndEvent, element, 0)
    expect(element.style.transform).toBe('translateX(0)')
  })

  it('should handle key down events', () => {
    const item = { id: 1, status: 'unread', data: { actionData: { actionType: 'course', identifier: 'id' } } }
    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    const readNotificationSpy = jest.spyOn(component, 'readNotification').mockResolvedValue()

    component.handleKeyDown(event, item)

    expect(readNotificationSpy).toHaveBeenCalledWith(item)
  })

  it('should destroy component', () => {
    component.ngOnDestroy()
    expect(socketMock.disconnect).toHaveBeenCalled()
  })
})