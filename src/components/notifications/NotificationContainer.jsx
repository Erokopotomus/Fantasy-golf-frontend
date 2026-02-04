import { useNotifications } from '../../context/NotificationContext'
import Toast from './Toast'

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast
            notification={notification}
            onDismiss={removeNotification}
          />
        </div>
      ))}
    </div>
  )
}

export default NotificationContainer
