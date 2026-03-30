import Capacitor
import ActivityKit
import Foundation

@objc(TimerLiveActivityPlugin)
public class TimerLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TimerLiveActivityPlugin"
    public let jsName = "TimerLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["available": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["available": false])
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        guard let projectName = call.getString("projectName") else {
            call.reject("projectName is required")
            return
        }

        let startTimeMs = call.getDouble("startTime") ?? (Date().timeIntervalSince1970 * 1000)
        let startDate = Date(timeIntervalSince1970: startTimeMs / 1000)

        if #available(iOS 16.2, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                call.reject("Live Activities not enabled")
                return
            }

            // End any existing timer activities first
            Task {
                for activity in Activity<TimerAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }

                let attributes = TimerAttributes(
                    projectName: projectName,
                    startTime: startDate
                )
                let initialState = TimerAttributes.ContentState(elapsedSeconds: 0)

                do {
                    let content = ActivityContent(state: initialState, staleDate: nil)
                    let activity = try Activity.request(
                        attributes: attributes,
                        content: content,
                        pushType: nil
                    )
                    call.resolve(["activityId": activity.id])
                } catch {
                    call.reject("Failed to start Live Activity: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("Live Activities require iOS 16.2+")
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            Task {
                let finalState = TimerAttributes.ContentState(elapsedSeconds: 0)
                let finalContent = ActivityContent(state: finalState, staleDate: nil)
                for activity in Activity<TimerAttributes>.activities {
                    await activity.end(finalContent, dismissalPolicy: .immediate)
                }
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }
}
